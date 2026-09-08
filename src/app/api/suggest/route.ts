import { z } from "zod";
import { CATEGORIES } from "@/lib/analysis/types";
import { getUserApiKey, requireUser, unauthorizedResponse } from "@/lib/auth/dal";
import type { User } from "@/lib/auth/users";
import { getUsdEurRate, usdToEur } from "@/lib/costs/exchange";
import { computeCostUsd, getPrice } from "@/lib/costs/prices";
import { addUsage, EMPTY_USAGE, type UsageTotals } from "@/lib/costs/types";
import { recordUsage } from "@/lib/costs/usage";
import { getDb } from "@/lib/db";
import type { RunUsage } from "@/lib/client-types";
import { createClient, LlmError, resolveModel, toLlmError } from "@/lib/llm/client";
import { MODEL_ID_PATTERN } from "@/lib/llm/models";
import { assessDocument, suggestAlternatives, type SuggestItem } from "@/lib/llm/suggest";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

const BodySchema = z.object({
  findings: z
    .array(
      z.object({
        id: z.string().min(1),
        category: z.enum(CATEGORIES as [string, ...string[]]),
        ruleName: z.string(),
        message: z.string(),
        matchedText: z.string(),
        paragraphText: z.string(),
      }),
    )
    .max(500),
  fullText: z.string().max(2_000_000).optional(),
  assess: z.boolean().default(false),
  /** Modell nur für diesen Durchlauf; sonst gilt die Konto-Einstellung. */
  model: z.string().trim().max(100).regex(MODEL_ID_PATTERN).optional(),
  fileName: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  let user: User;
  try {
    user = await requireUser();
  } catch {
    return unauthorizedResponse();
  }

  const client = createClient(getUserApiKey(user.id));
  if (!client) {
    return Response.json(
      { error: "Kein Anthropic-API-Key hinterlegt. Unter „Konto“ kannst du einen Key speichern; die Regel-Analyse funktioniert weiterhin.", reason: "no_api_key" },
      { status: 503 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const model = body.model ?? resolveModel(user.model);
  const db = getDb();
  const price = getPrice(db, model);
  const fileName = body.fileName ?? null;

  const [suggestResult, assessResult] = await Promise.allSettled([
    suggestAlternatives(client, model, body.findings as SuggestItem[]),
    body.assess && body.fullText?.trim() ? assessDocument(client, model, body.fullText) : Promise.resolve(null),
  ]);

  // Jeden erfolgreichen Teil buchen, auch wenn der andere gescheitert ist.
  let tokens: UsageTotals = EMPTY_USAGE;
  let costUsd: number | null = price ? 0 : null;
  const book = (purpose: "suggest" | "assess", usage: UsageTotals) => {
    if (usage.requests === 0) return;
    const cost = computeCostUsd(price, usage);
    recordUsage(db, { userId: user.id, model, purpose, usage, costUsd: cost, fileName });
    tokens = addUsage(tokens, usage);
    if (cost !== null && costUsd !== null) costUsd += cost;
  };
  if (suggestResult.status === "fulfilled") book("suggest", suggestResult.value.usage);
  if (assessResult.status === "fulfilled" && assessResult.value) book("assess", assessResult.value.usage);

  const toResponseError = (err: unknown) => {
    const llmErr = err instanceof LlmError ? err : toLlmError(err, model);
    if (llmErr.reason === "api") console.error(err);
    return llmErr;
  };

  if (suggestResult.status === "rejected") {
    const llmErr = toResponseError(suggestResult.reason);
    return Response.json({ error: llmErr.message, reason: llmErr.reason }, { status: llmErr.status });
  }

  const rate = await getUsdEurRate(db);
  const usage: RunUsage = {
    model,
    priced: price !== null,
    costUsd,
    costEur: costUsd !== null && rate ? usdToEur(costUsd, rate) : null,
    rate,
    tokens,
  };

  return Response.json({
    model,
    suggestions: Object.fromEntries(suggestResult.value.suggestions),
    assessment: assessResult.status === "fulfilled" ? (assessResult.value?.assessment ?? null) : null,
    assessmentError: assessResult.status === "rejected" ? `Die Gesamteinschätzung ist fehlgeschlagen: ${toResponseError(assessResult.reason).message}` : undefined,
    usage,
  });
}

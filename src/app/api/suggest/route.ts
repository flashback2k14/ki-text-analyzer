import { z } from "zod";
import { CATEGORIES } from "@/lib/analysis/types";
import { getClient, getModel, LlmError, toLlmError } from "@/lib/llm/client";
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
});

export async function POST(request: Request) {
  const client = getClient();
  if (!client) {
    return Response.json(
      { error: "Kein Anthropic-API-Key konfiguriert. Alternativen vom Sprachmodell sind deaktiviert; die Regel-Analyse funktioniert weiterhin.", reason: "no_api_key" },
      { status: 503 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const model = getModel();
  try {
    const [suggestions, assessment] = await Promise.all([
      suggestAlternatives(client, model, body.findings as SuggestItem[]),
      body.assess && body.fullText?.trim() ? assessDocument(client, model, body.fullText) : Promise.resolve(null),
    ]);
    return Response.json({
      model,
      suggestions: Object.fromEntries(suggestions),
      assessment,
    });
  } catch (err) {
    const llmErr = err instanceof LlmError ? err : toLlmError(err);
    if (llmErr.reason === "api") console.error(err);
    return Response.json({ error: llmErr.message, reason: llmErr.reason }, { status: llmErr.status });
  }
}

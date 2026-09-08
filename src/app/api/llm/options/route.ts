import { getUserApiKey, requireUser, unauthorizedResponse } from "@/lib/auth/dal";
import type { LlmOptionsResponse } from "@/lib/client-types";
import { getUsdEurRate } from "@/lib/costs/exchange";
import { listPrices } from "@/lib/costs/prices";
import type { PriceRates } from "@/lib/costs/types";
import { getDb } from "@/lib/db";
import { llmAvailableFor, resolveModel } from "@/lib/llm/client";
import { KNOWN_MODELS } from "@/lib/llm/models";

export const dynamic = "force-dynamic";

/** Modelle mit Preisen, Vorbelegung aus dem Konto und Wechselkurs für den Claude-Dialog. */
export async function GET() {
  let userId: string;
  let userModel: string | null;
  try {
    const user = await requireUser();
    userId = user.id;
    userModel = user.model;
  } catch {
    return unauthorizedResponse();
  }

  const db = getDb();
  const prices = new Map<string, PriceRates>();
  for (const p of listPrices(db)) {
    prices.set(p.model, {
      inputUsdPerMtok: p.inputUsdPerMtok,
      outputUsdPerMtok: p.outputUsdPerMtok,
      cacheWriteUsdPerMtok: p.cacheWriteUsdPerMtok,
      cacheReadUsdPerMtok: p.cacheReadUsdPerMtok,
    });
  }

  const models = KNOWN_MODELS.map((m) => ({ id: m.id, label: m.label, hinweis: m.hinweis, price: prices.get(m.id) ?? null }));
  const defaultModel = resolveModel(userModel);
  if (!models.some((m) => m.id === defaultModel)) {
    models.push({
      id: defaultModel,
      label: defaultModel,
      hinweis: userModel ? "Eigene Modell-ID aus dem Konto" : "Server-Vorgabe",
      price: prices.get(defaultModel) ?? null,
    });
  }

  const body: LlmOptionsResponse = {
    defaultModel,
    models,
    rate: await getUsdEurRate(db),
    llmAvailable: llmAvailableFor(getUserApiKey(userId)),
  };
  return Response.json(body);
}

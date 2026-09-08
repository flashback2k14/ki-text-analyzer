// Ohne Node-Imports, damit Client-Komponenten die Typen nutzen können.

/** Preise in USD je 1 Mio. Token. */
export interface PriceRates {
  inputUsdPerMtok: number;
  outputUsdPerMtok: number;
  cacheWriteUsdPerMtok: number;
  cacheReadUsdPerMtok: number;
}

export interface ModelPrice extends PriceRates {
  model: string;
  label: string;
  updatedAt: number;
}

/** Token-Summen eines Durchlaufs, wie sie die API zurückmeldet. */
export interface UsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}

export const EMPTY_USAGE: UsageTotals = { requests: 0, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 };

export function addUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    requests: a.requests + b.requests,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  };
}

/** Wechselkurs: USD je 1 EUR, wie ihn die EZB veröffentlicht. */
export interface ExchangeRate {
  rate: number;
  fetchedAt: number;
  source: "ecb" | "env";
}

export type UsagePurpose = "suggest" | "assess";

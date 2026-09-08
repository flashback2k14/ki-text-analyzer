// Ohne Node-Imports, damit der Dialog im Browser schätzen kann.
import type { PriceRates } from "./types";

/** Grobe Annahmen für deutsche Texte und die Prompts dieser App. */
export const ESTIMATE = {
  charsPerToken: 3.5,
  chunkSize: 15,
  /** System-Prompt mit Stilregeln plus Anweisung je Chunk. */
  suggestOverheadTokensPerChunk: 1600,
  /** System-Prompt der Gesamteinschätzung. */
  assessOverheadTokens: 1200,
  outputTokensPerFinding: 120,
  assessOutputTokens: 600,
  lowFactor: 0.7,
  highFactor: 1.5,
} as const;

export interface EstimateInput {
  /** Zeichen aller Absätze, die mit den Fundstellen mitgeschickt werden. */
  suggestChars: number;
  /** Zeichen des Volltexts für die Einschätzung. */
  assessChars: number;
  findingsCount: number;
  assess: boolean;
}

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
}

export interface CostEstimate extends TokenEstimate {
  lowUsd: number;
  highUsd: number;
}

export function estimateTokens(input: EstimateInput): TokenEstimate {
  const chunks = input.findingsCount > 0 ? Math.ceil(input.findingsCount / ESTIMATE.chunkSize) : 0;
  let inputTokens = Math.ceil(input.suggestChars / ESTIMATE.charsPerToken) + chunks * ESTIMATE.suggestOverheadTokensPerChunk;
  let outputTokens = input.findingsCount * ESTIMATE.outputTokensPerFinding;
  if (input.assess) {
    inputTokens += Math.ceil(input.assessChars / ESTIMATE.charsPerToken) + ESTIMATE.assessOverheadTokens;
    outputTokens += ESTIMATE.assessOutputTokens;
  }
  return { inputTokens, outputTokens };
}

/** Kostenspanne in USD; null ohne Preis. */
export function estimateCost(input: EstimateInput, price: PriceRates | null): CostEstimate | null {
  if (!price) return null;
  const tokens = estimateTokens(input);
  const usd = (tokens.inputTokens * price.inputUsdPerMtok + tokens.outputTokens * price.outputUsdPerMtok) / 1_000_000;
  return { ...tokens, lowUsd: usd * ESTIMATE.lowFactor, highUsd: usd * ESTIMATE.highFactor };
}

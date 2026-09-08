import type { AnalysisResult } from "@/lib/analysis/types";
import type { ExchangeRate, PriceRates, UsageTotals } from "@/lib/costs/types";
import type { Assessment, Suggestion } from "@/lib/llm/suggest";

export type AnalyzeResponse = AnalysisResult & { fileName: string; llmAvailable: boolean };

/** Kosten und Token eines Claude-Durchlaufs, wie sie die Suggest-Route zurückgibt. */
export interface RunUsage {
  model: string;
  /** false, wenn für das Modell kein Preis hinterlegt ist. */
  priced: boolean;
  costUsd: number | null;
  costEur: number | null;
  rate: ExchangeRate | null;
  tokens: UsageTotals;
}

export interface SuggestResponse {
  model: string;
  suggestions: Record<string, Suggestion>;
  assessment: (Assessment & { truncated: boolean }) | null;
  assessmentError?: string;
  usage: RunUsage;
}

export interface LlmModelOption {
  id: string;
  label: string;
  hinweis: string;
  price: PriceRates | null;
}

export interface LlmOptionsResponse {
  defaultModel: string;
  models: LlmModelOption[];
  rate: ExchangeRate | null;
  llmAvailable: boolean;
}

export interface ApiError {
  error: string;
  reason?: string;
}

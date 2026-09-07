import type { AnalysisResult } from "@/lib/analysis/types";
import type { Assessment, Suggestion } from "@/lib/llm/suggest";

export type AnalyzeResponse = AnalysisResult & { fileName: string; llmAvailable: boolean };

export interface SuggestResponse {
  model: string;
  suggestions: Record<string, Suggestion>;
  assessment: (Assessment & { truncated: boolean }) | null;
}

export interface ApiError {
  error: string;
  reason?: string;
}

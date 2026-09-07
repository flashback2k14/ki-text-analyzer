export type Category =
  | "bedeutung"
  | "werbung"
  | "redaktionell"
  | "autoritaet"
  | "modewort"
  | "satzbau"
  | "struktur"
  | "formatierung"
  | "artefakt"
  | "dialog";

export type Severity = 1 | 2 | 3;

export interface Run {
  text: string;
  bold: boolean;
}

export interface Paragraph {
  /** Position im Dokument (0-basiert, inklusive leerer Absätze). */
  index: number;
  /** Verkettung aller Run-Texte. Offsets in Findings beziehen sich hierauf. */
  text: string;
  style?: string;
  isHeading: boolean;
  isListItem: boolean;
  runs: Run[];
}

export interface Finding {
  id: string;
  paragraphIndex: number;
  start: number;
  end: number;
  matchedText: string;
  category: Category;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  suggestionSource?: "rule" | "llm";
  suggestionReason?: string;
}

export interface Stats {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceLength: number;
  dashesPer1000Words: number;
  findingsPerCategory: Record<Category, number>;
}

export type ScoreLabel = "unauffällig" | "auffällig" | "stark verdächtig";

export interface Score {
  value: number;
  label: ScoreLabel;
  reasons: string[];
}

export interface AnalysisResult {
  paragraphs: Paragraph[];
  findings: Finding[];
  stats: Stats;
  score: Score;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  bedeutung: "Aufgeblähte Bedeutung",
  werbung: "Werbesprache",
  redaktionell: "Redaktioneller Kommentar",
  autoritaet: "Vage Autorität",
  modewort: "KI-Modewort",
  satzbau: "Satzbau",
  struktur: "Struktur",
  formatierung: "Formatierung",
  artefakt: "Technisches Artefakt",
  dialog: "Dialog- oder Meta-Rest",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

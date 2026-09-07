// Ohne Node-Imports, damit Client-Komponenten die Liste nutzen können.

export const DEFAULT_MODEL = "claude-opus-5";

export interface KnownModel {
  id: string;
  label: string;
  hinweis: string;
}

export const KNOWN_MODELS: KnownModel[] = [
  { id: "claude-opus-5", label: "Claude Opus 5", hinweis: "Stärkstes Modell der Opus-Reihe, Standard" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", hinweis: "Schnell und günstig, gute Qualität" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hinweis: "Sehr schnell, am günstigsten" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", hinweis: "Vorgänger von Opus 5" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hinweis: "Vorgänger von Sonnet 5" },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1", hinweis: "Leistungsfähigstes Modell, höherer Preis" },
];

export const MODEL_ID_PATTERN = /^claude-[a-z0-9.-]+$/;

/** Modell des Users, sonst Server-Vorgabe aus ANTHROPIC_MODEL, sonst Standard. */
export function resolveModel(userModel: string | null | undefined, env: Record<string, string | undefined> = process.env): string {
  const own = userModel?.trim();
  if (own) return own;
  return env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function modelLabel(id: string): string {
  return KNOWN_MODELS.find((m) => m.id === id)?.label ?? id;
}

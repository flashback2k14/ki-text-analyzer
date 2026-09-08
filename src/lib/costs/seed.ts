/**
 * Startwerte für die Tabelle model_prices (USD je 1 Mio. Token).
 * Quelle: Anthropic-Preisliste, Stand 2026-06-24. Cache-Schreiben = 1,25 × Eingabe,
 * Cache-Lesen = 0,1 × Eingabe, sofern Anthropic nichts anderes nennt.
 */
export interface PriceSeed {
  model: string;
  label: string;
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

export const PRICE_SEED_DATE = "2026-06-24";

export const PRICE_SEED: PriceSeed[] = [
  { model: "claude-fable-5-1", label: "Claude Fable 5.1", input: 10, output: 50, cacheWrite: 12.5, cacheRead: 0.25 },
  { model: "claude-opus-5", label: "Claude Opus 5", input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  { model: "claude-opus-4-8", label: "Claude Opus 4.8", input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  { model: "claude-opus-4-7", label: "Claude Opus 4.7", input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  { model: "claude-opus-4-6", label: "Claude Opus 4.6", input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  { model: "claude-sonnet-5", label: "Claude Sonnet 5", input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  { model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  { model: "claude-haiku-4-5", label: "Claude Haiku 4.5", input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
];

/** SQL für die Migration: legt fehlende Preiszeilen an, überschreibt vorhandene nicht. */
export function priceSeedSql(): string {
  const rows = PRICE_SEED.map(
    (p) =>
      `('${p.model}', '${p.label.replace(/'/g, "''")}', ${p.input}, ${p.output}, ${p.cacheWrite}, ${p.cacheRead}, CAST(strftime('%s', '${PRICE_SEED_DATE}') AS INTEGER) * 1000)`,
  );
  return `INSERT OR IGNORE INTO model_prices (model, label, input_usd_per_mtok, output_usd_per_mtok, cache_write_usd_per_mtok, cache_read_usd_per_mtok, updated_at) VALUES\n  ${rows.join(",\n  ")};`;
}

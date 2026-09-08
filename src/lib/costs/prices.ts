import type { DatabaseSync } from "node:sqlite";
import type { ModelPrice, UsageTotals } from "./types";

interface PriceRow {
  model: string;
  label: string;
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
  cache_write_usd_per_mtok: number;
  cache_read_usd_per_mtok: number;
  updated_at: number;
}

const COLUMNS = "model, label, input_usd_per_mtok, output_usd_per_mtok, cache_write_usd_per_mtok, cache_read_usd_per_mtok, updated_at";

function toPrice(row: PriceRow): ModelPrice {
  return {
    model: row.model,
    label: row.label,
    inputUsdPerMtok: row.input_usd_per_mtok,
    outputUsdPerMtok: row.output_usd_per_mtok,
    cacheWriteUsdPerMtok: row.cache_write_usd_per_mtok,
    cacheReadUsdPerMtok: row.cache_read_usd_per_mtok,
    updatedAt: row.updated_at,
  };
}

export function getPrice(db: DatabaseSync, model: string): ModelPrice | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM model_prices WHERE model = ?`).get(model) as PriceRow | undefined;
  return row ? toPrice(row) : null;
}

export function listPrices(db: DatabaseSync): ModelPrice[] {
  const rows = db.prepare(`SELECT ${COLUMNS} FROM model_prices ORDER BY model`).all() as unknown as PriceRow[];
  return rows.map(toPrice);
}

export function upsertPrice(db: DatabaseSync, price: Omit<ModelPrice, "updatedAt">, now = Date.now()): void {
  db.prepare(
    `INSERT INTO model_prices (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(model) DO UPDATE SET label = excluded.label, input_usd_per_mtok = excluded.input_usd_per_mtok,
       output_usd_per_mtok = excluded.output_usd_per_mtok, cache_write_usd_per_mtok = excluded.cache_write_usd_per_mtok,
       cache_read_usd_per_mtok = excluded.cache_read_usd_per_mtok, updated_at = excluded.updated_at`,
  ).run(price.model, price.label, price.inputUsdPerMtok, price.outputUsdPerMtok, price.cacheWriteUsdPerMtok, price.cacheReadUsdPerMtok, now);
}

/** Kosten in USD aus den tatsächlichen Token; null, wenn kein Preis hinterlegt ist. */
export function computeCostUsd(price: ModelPrice | null, usage: UsageTotals): number | null {
  if (!price) return null;
  const usd =
    (usage.inputTokens * price.inputUsdPerMtok +
      usage.outputTokens * price.outputUsdPerMtok +
      usage.cacheWriteTokens * price.cacheWriteUsdPerMtok +
      usage.cacheReadTokens * price.cacheReadUsdPerMtok) /
    1_000_000;
  return Math.round(usd * 1e6) / 1e6;
}

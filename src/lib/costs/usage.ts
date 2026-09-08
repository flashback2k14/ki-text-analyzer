import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { UsagePurpose, UsageTotals } from "./types";

export interface UsageEntry {
  userId: string;
  model: string;
  purpose: UsagePurpose;
  usage: UsageTotals;
  costUsd: number | null;
  fileName?: string | null;
  createdAt?: number;
}

export interface UsageRow {
  id: string;
  createdAt: number;
  model: string;
  purpose: UsagePurpose;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  costUsd: number | null;
  fileName: string | null;
}

export interface ModelMonthSummary {
  model: string;
  runs: number;
  requests: number;
  costUsd: number;
  unpriced: boolean;
}

export interface MonthlySummary {
  /** "YYYY-MM" in der Zeitzone des Servers. */
  month: string;
  runs: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  /** Mindestens ein Eintrag ohne hinterlegten Preis. */
  unpriced: boolean;
  byModel: ModelMonthSummary[];
}

export function recordUsage(db: DatabaseSync, entry: UsageEntry): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO llm_usage (id, user_id, created_at, model, purpose, requests, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd, file_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    entry.userId,
    entry.createdAt ?? Date.now(),
    entry.model,
    entry.purpose,
    entry.usage.requests,
    entry.usage.inputTokens,
    entry.usage.outputTokens,
    entry.usage.cacheWriteTokens,
    entry.usage.cacheReadTokens,
    entry.costUsd,
    entry.fileName ?? null,
  );
  return id;
}

interface GroupRow {
  month: string;
  model: string;
  runs: number;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  cost_usd: number | null;
  unpriced: number;
}

/** Kosten je Monat (absteigend) mit Aufschlüsselung je Modell. */
export function monthlySummary(db: DatabaseSync, userId: string): MonthlySummary[] {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at / 1000, 'unixepoch', 'localtime') AS month,
              model,
              COUNT(*) AS runs,
              SUM(requests) AS requests,
              SUM(input_tokens) AS input_tokens,
              SUM(output_tokens) AS output_tokens,
              SUM(cache_write_tokens) AS cache_write_tokens,
              SUM(cache_read_tokens) AS cache_read_tokens,
              SUM(cost_usd) AS cost_usd,
              SUM(CASE WHEN cost_usd IS NULL THEN 1 ELSE 0 END) AS unpriced
       FROM llm_usage
       WHERE user_id = ?
       GROUP BY month, model
       ORDER BY month DESC, cost_usd DESC, model`,
    )
    .all(userId) as unknown as GroupRow[];

  const months = new Map<string, MonthlySummary>();
  for (const row of rows) {
    let m = months.get(row.month);
    if (!m) {
      m = { month: row.month, runs: 0, requests: 0, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, costUsd: 0, unpriced: false, byModel: [] };
      months.set(row.month, m);
    }
    m.runs += row.runs;
    m.requests += row.requests;
    m.inputTokens += row.input_tokens;
    m.outputTokens += row.output_tokens;
    m.cacheWriteTokens += row.cache_write_tokens;
    m.cacheReadTokens += row.cache_read_tokens;
    m.costUsd += row.cost_usd ?? 0;
    m.unpriced ||= row.unpriced > 0;
    m.byModel.push({ model: row.model, runs: row.runs, requests: row.requests, costUsd: row.cost_usd ?? 0, unpriced: row.unpriced > 0 });
  }
  return [...months.values()];
}

interface UsageDbRow {
  id: string;
  created_at: number;
  model: string;
  purpose: UsagePurpose;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  cost_usd: number | null;
  file_name: string | null;
}

export function recentUsage(db: DatabaseSync, userId: string, limit = 10): UsageRow[] {
  const rows = db
    .prepare(
      `SELECT id, created_at, model, purpose, requests, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd, file_name
       FROM llm_usage WHERE user_id = ? ORDER BY created_at DESC, id LIMIT ?`,
    )
    .all(userId, limit) as unknown as UsageDbRow[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    model: r.model,
    purpose: r.purpose,
    requests: r.requests,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    cacheWriteTokens: r.cache_write_tokens,
    cacheReadTokens: r.cache_read_tokens,
    costUsd: r.cost_usd,
    fileName: r.file_name,
  }));
}

import type { DatabaseSync } from "node:sqlite";

/** Vom User eingetragener Kontostand und was seitdem gebucht wurde. Beträge in USD. */
export interface CreditBalance {
  amountUsd: number;
  /** Zeitpunkt, zu dem der eingetragene Kontostand galt. */
  asOf: number;
  spentUsd: number;
  remainingUsd: number;
  /** Seit dem Stichtag gab es Durchläufe ohne hinterlegten Preis. */
  unpriced: boolean;
}

export function setBalance(db: DatabaseSync, userId: string, amountUsd: number, asOf: number, now = Date.now()): void {
  db.prepare(
    `INSERT INTO credit_balances (user_id, amount_usd, as_of, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET amount_usd = excluded.amount_usd, as_of = excluded.as_of, updated_at = excluded.updated_at`,
  ).run(userId, amountUsd, asOf, now);
}

export function clearBalance(db: DatabaseSync, userId: string): void {
  db.prepare("DELETE FROM credit_balances WHERE user_id = ?").run(userId);
}

export function getBalance(db: DatabaseSync, userId: string): CreditBalance | null {
  const row = db.prepare("SELECT amount_usd, as_of FROM credit_balances WHERE user_id = ?").get(userId) as { amount_usd: number; as_of: number } | undefined;
  if (!row) return null;
  const spent = db
    .prepare(
      `SELECT COALESCE(SUM(cost_usd), 0) AS spent, SUM(CASE WHEN cost_usd IS NULL THEN 1 ELSE 0 END) AS unpriced
       FROM llm_usage WHERE user_id = ? AND created_at >= ?`,
    )
    .get(userId, row.as_of) as { spent: number; unpriced: number | null };
  return {
    amountUsd: row.amount_usd,
    asOf: row.as_of,
    spentUsd: spent.spent,
    remainingUsd: row.amount_usd - spent.spent,
    unpriced: (spent.unpriced ?? 0) > 0,
  };
}

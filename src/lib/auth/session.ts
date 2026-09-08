import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { SESSION_TTL_MS } from "./constants";
import type { User } from "./users";

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createSession(db: DatabaseSync, userId: string, now = Date.now()): { token: string; expiresAt: number } {
  deleteExpiredSessions(db, now);
  const token = generateToken();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(hashToken(token), userId, expiresAt, now);
  return { token, expiresAt };
}

interface SessionUserRow {
  session_id: string;
  expires_at: number;
  id: string;
  email: string;
  api_key_hint: string | null;
  api_key_updated_at: number | null;
  model: string | null;
  created_at: number;
}

/** Liefert den User zur Session oder null. Abgelaufene Sessions werden dabei gelöscht. */
export function findSessionUser(db: DatabaseSync, token: string, now = Date.now()): User | null {
  const row = db
    .prepare(
      `SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.api_key_hint, u.api_key_updated_at, u.model, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(hashToken(token)) as SessionUserRow | undefined;
  if (!row) return null;
  if (row.expires_at <= now) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    apiKeyHint: row.api_key_hint,
    apiKeyUpdatedAt: row.api_key_updated_at,
    model: row.model,
    createdAt: row.created_at,
  };
}

export function deleteSession(db: DatabaseSync, token: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
}

export function deleteSessionsForUser(db: DatabaseSync, userId: string): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function deleteExpiredSessions(db: DatabaseSync, now = Date.now()): number {
  const result = db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  return Number(result.changes);
}

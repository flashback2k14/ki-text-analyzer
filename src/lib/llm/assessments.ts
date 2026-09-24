import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Assessment } from "./suggest";

export interface AssessmentEntry {
  userId: string;
  usageId: string | null;
  model: string;
  fileName?: string | null;
  assessment: Assessment & { truncated: boolean };
  createdAt?: number;
}

export interface StoredAssessment extends Assessment {
  id: string;
  createdAt: number;
  model: string;
  fileName: string | null;
  truncated: boolean;
}

interface AssessmentDbRow {
  id: string;
  created_at: number;
  model: string;
  file_name: string | null;
  wahrscheinlichkeit: Assessment["wahrscheinlichkeit"];
  einschaetzung: string;
  auffaelligkeiten: string;
  staerken: string;
  truncated: number;
}

function parseList(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function fromRow(r: AssessmentDbRow): StoredAssessment {
  return {
    id: r.id,
    createdAt: r.created_at,
    model: r.model,
    fileName: r.file_name,
    wahrscheinlichkeit: r.wahrscheinlichkeit,
    einschaetzung: r.einschaetzung,
    auffaelligkeiten: parseList(r.auffaelligkeiten),
    staerken: parseList(r.staerken),
    truncated: r.truncated === 1,
  };
}

const COLUMNS = "id, created_at, model, file_name, wahrscheinlichkeit, einschaetzung, auffaelligkeiten, staerken, truncated";

export function saveAssessment(db: DatabaseSync, entry: AssessmentEntry): string {
  const id = randomUUID();
  const a = entry.assessment;
  db.prepare(
    `INSERT INTO assessments (id, user_id, usage_id, created_at, model, file_name, wahrscheinlichkeit, einschaetzung, auffaelligkeiten, staerken, truncated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    entry.userId,
    entry.usageId,
    entry.createdAt ?? Date.now(),
    entry.model,
    entry.fileName ?? null,
    a.wahrscheinlichkeit,
    a.einschaetzung,
    JSON.stringify(a.auffaelligkeiten),
    JSON.stringify(a.staerken),
    a.truncated ? 1 : 0,
  );
  return id;
}

export function listAssessments(db: DatabaseSync, userId: string, limit = 20): StoredAssessment[] {
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM assessments WHERE user_id = ? ORDER BY created_at DESC, id LIMIT ?`)
    .all(userId, limit) as unknown as AssessmentDbRow[];
  return rows.map(fromRow);
}

export function getAssessment(db: DatabaseSync, userId: string, id: string): StoredAssessment | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM assessments WHERE user_id = ? AND id = ?`).get(userId, id) as unknown as AssessmentDbRow | undefined;
  return row ? fromRow(row) : null;
}

/** Löscht nur Einträge des angegebenen Users; liefert false, wenn nichts gelöscht wurde. */
export function deleteAssessment(db: DatabaseSync, userId: string, id: string): boolean {
  const res = db.prepare("DELETE FROM assessments WHERE user_id = ? AND id = ?").run(userId, id);
  return Number(res.changes) > 0;
}

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface User {
  id: string;
  email: string;
  createdAt: number;
  apiKeyHint: string | null;
  apiKeyUpdatedAt: number | null;
  model: string | null;
}

export interface UserWithHash extends User {
  passwordHash: string;
}

export class UserExistsError extends Error {
  constructor() {
    super("Für diese E-Mail-Adresse gibt es bereits ein Konto.");
    this.name = "UserExistsError";
  }
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  api_key_hint: string | null;
  api_key_updated_at: number | null;
  model: string | null;
  created_at: number;
}

const USER_COLUMNS = "id, email, password_hash, api_key_hint, api_key_updated_at, model, created_at";

function toUser(row: UserRow): UserWithHash {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    apiKeyHint: row.api_key_hint,
    apiKeyUpdatedAt: row.api_key_updated_at,
    model: row.model,
    createdAt: row.created_at,
  };
}

function withoutHash(user: UserWithHash): User {
  const { passwordHash: _omit, ...rest } = user;
  void _omit;
  return rest;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const SQLITE_CONSTRAINT_UNIQUE = 2067;

export function createUser(db: DatabaseSync, email: string, passwordHash: string, now = Date.now()): User {
  const id = randomUUID();
  const normalized = normalizeEmail(email);
  try {
    db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(id, normalized, passwordHash, now);
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { errcode?: number }).errcode === SQLITE_CONSTRAINT_UNIQUE) {
      throw new UserExistsError();
    }
    throw err;
  }
  return { id, email: normalized, createdAt: now, apiKeyHint: null, apiKeyUpdatedAt: null, model: null };
}

export function findUserByEmail(db: DatabaseSync, email: string): UserWithHash | null {
  const row = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`).get(normalizeEmail(email)) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function findUserById(db: DatabaseSync, id: string): User | null {
  const row = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  return row ? withoutHash(toUser(row)) : null;
}

export function findUserWithHashById(db: DatabaseSync, id: string): UserWithHash | null {
  const row = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function setApiKey(db: DatabaseSync, userId: string, encrypted: Buffer, hint: string, now = Date.now()): void {
  db.prepare("UPDATE users SET api_key_enc = ?, api_key_hint = ?, api_key_updated_at = ? WHERE id = ?").run(encrypted, hint, now, userId);
}

export function clearApiKey(db: DatabaseSync, userId: string): void {
  db.prepare("UPDATE users SET api_key_enc = NULL, api_key_hint = NULL, api_key_updated_at = NULL WHERE id = ?").run(userId);
}

export function getEncryptedApiKey(db: DatabaseSync, userId: string): Uint8Array | null {
  const row = db.prepare("SELECT api_key_enc FROM users WHERE id = ?").get(userId) as { api_key_enc: Uint8Array | null } | undefined;
  return row?.api_key_enc ?? null;
}

export function setModel(db: DatabaseSync, userId: string, model: string | null): void {
  db.prepare("UPDATE users SET model = ? WHERE id = ?").run(model, userId);
}

export function updatePasswordHash(db: DatabaseSync, userId: string, passwordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}

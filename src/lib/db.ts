import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { priceSeedSql } from "./costs/seed";
import { getDataDir } from "./env";

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id                 TEXT PRIMARY KEY,
    email              TEXT NOT NULL UNIQUE,
    password_hash      TEXT NOT NULL,
    api_key_enc        BLOB,
    api_key_hint       TEXT,
    api_key_updated_at INTEGER,
    model              TEXT,
    created_at         INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS model_prices (
    model                    TEXT PRIMARY KEY,
    label                    TEXT NOT NULL,
    input_usd_per_mtok       REAL NOT NULL,
    output_usd_per_mtok      REAL NOT NULL,
    cache_write_usd_per_mtok REAL NOT NULL,
    cache_read_usd_per_mtok  REAL NOT NULL,
    updated_at               INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS llm_usage (
    id                 TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at         INTEGER NOT NULL,
    model              TEXT NOT NULL,
    purpose            TEXT NOT NULL,
    requests           INTEGER NOT NULL,
    input_tokens       INTEGER NOT NULL,
    output_tokens      INTEGER NOT NULL,
    cache_write_tokens INTEGER NOT NULL,
    cache_read_tokens  INTEGER NOT NULL,
    cost_usd           REAL,
    file_name          TEXT
  );
  CREATE INDEX IF NOT EXISTS llm_usage_user_created ON llm_usage(user_id, created_at);
  CREATE TABLE IF NOT EXISTS exchange_rates (
    currency   TEXT PRIMARY KEY,
    rate       REAL NOT NULL,
    fetched_at INTEGER NOT NULL,
    source     TEXT NOT NULL
  );
  ${priceSeedSql()}
  `,
];

/** Öffnet die Datenbank, legt Verzeichnis und Schema an. ":memory:" für Tests. */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | undefined;
  let hasRow = Boolean(row);
  const current = row?.version ?? 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[i]);
      if (hasRow) db.prepare("UPDATE schema_version SET version = ?").run(i + 1);
      else db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(i + 1);
      db.exec("COMMIT");
      hasRow = true;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

const globalStore = globalThis as unknown as { __kiTextAnalyzerDb?: DatabaseSync };

/** Prozessweiter Handle; liegt auf globalThis, damit HMR im Dev-Modus keine weiteren Handles öffnet. */
export function getDb(): DatabaseSync {
  if (!globalStore.__kiTextAnalyzerDb) {
    globalStore.__kiTextAnalyzerDb = openDatabase(join(getDataDir(), "app.db"));
  }
  return globalStore.__kiTextAnalyzerDb;
}

export function closeDb(): void {
  globalStore.__kiTextAnalyzerDb?.close();
  globalStore.__kiTextAnalyzerDb = undefined;
}

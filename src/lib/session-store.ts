// Nur im Browser verwenden. Hält das analysierte Dokument samt Ergebnis in IndexedDB,
// damit es Seitenwechsel (Konto ↔ Dashboard) und Reloads übersteht. Gelöscht wird nur bei
// „Neue Datei“ und beim Abmelden; ein anderer angemeldeter User sieht den Stand nicht.
import type { Category, Finding } from "@/lib/analysis/types";
import type { AnalyzeResponse, RunUsage } from "@/lib/client-types";
import type { Assessment } from "@/lib/llm/suggest";

const DB_NAME = "ki-text-analyzer";
const STORE = "session";
const KEY = "current";

export interface StoredSession {
  userId: string;
  savedAt: number;
  file: Blob;
  fileName: string;
  result: AnalyzeResponse;
  findings: Finding[];
  assessment: (Assessment & { truncated: boolean }) | null;
  llmModel: string | null;
  runUsage: RunUsage | null;
  llmState: "idle" | "done" | "error";
  selectedId: string | null;
  hidden: Category[];
}

function available(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Nach „Neue Datei“ und beim Abmelden darf nichts mehr geschrieben werden, sonst legt der
 * Unmount der Analyse-Seite den gerade gelöschten Stand wieder an. Ein neuer Upload gibt wieder frei.
 */
let persistBlocked = false;

export function blockPersist(): void {
  persistBlocked = true;
}

export function allowPersist(): void {
  persistBlocked = false;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onabort = () => db.close();
  });
}

export async function saveStoredSession(session: StoredSession): Promise<void> {
  if (!available() || persistBlocked) return;
  try {
    const db = await openDb();
    await request(db, "readwrite", (s) => s.put(session, KEY));
  } catch (err) {
    console.warn("[ki-text-analyzer] Sitzung konnte nicht gespeichert werden:", err);
  }
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  if (!available()) return null;
  try {
    const db = await openDb();
    const value = await request<StoredSession | undefined>(db, "readonly", (s) => s.get(KEY));
    return value && value.result && value.file ? value : null;
  } catch (err) {
    console.warn("[ki-text-analyzer] Sitzung konnte nicht geladen werden:", err);
    return null;
  }
}

export async function clearStoredSession(): Promise<void> {
  if (!available()) return;
  try {
    const db = await openDb();
    await request(db, "readwrite", (s) => s.delete(KEY));
  } catch (err) {
    console.warn("[ki-text-analyzer] Sitzung konnte nicht gelöscht werden:", err);
  }
}

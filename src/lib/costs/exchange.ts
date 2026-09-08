import type { DatabaseSync } from "node:sqlite";
import type { ExchangeRate } from "./types";

export const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export const RATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

export interface RateOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: number;
  maxAgeMs?: number;
}

/** Liest den USD-Kurs aus dem EZB-Tages-XML (Cube currency='USD' rate='…'). */
export function parseEcbUsdRate(xml: string): number | null {
  const m = xml.match(/currency=['"]USD['"]\s+rate=['"]([0-9.]+)['"]/);
  if (!m) return null;
  const rate = Number(m[1]);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function readStored(db: DatabaseSync): ExchangeRate | null {
  const row = db.prepare("SELECT rate, fetched_at, source FROM exchange_rates WHERE currency = 'USD'").get() as
    | { rate: number; fetched_at: number; source: "ecb" | "env" }
    | undefined;
  return row ? { rate: row.rate, fetchedAt: row.fetched_at, source: row.source } : null;
}

function store(db: DatabaseSync, rate: ExchangeRate): void {
  db.prepare(
    `INSERT INTO exchange_rates (currency, rate, fetched_at, source) VALUES ('USD', ?, ?, ?)
     ON CONFLICT(currency) DO UPDATE SET rate = excluded.rate, fetched_at = excluded.fetched_at, source = excluded.source`,
  ).run(rate.rate, rate.fetchedAt, rate.source);
}

function envRate(env: Record<string, string | undefined>, now: number): ExchangeRate | null {
  const raw = env.USD_EUR_RATE?.trim().replace(",", ".");
  if (!raw) return null;
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate <= 0) {
    console.warn(`[ki-text-analyzer] USD_EUR_RATE="${env.USD_EUR_RATE}" ist keine gültige Zahl.`);
    return null;
  }
  return { rate, fetchedAt: now, source: "env" };
}

async function fetchEcbRate(fetchImpl: typeof fetch, now: number): Promise<ExchangeRate> {
  const res = await fetchImpl(ECB_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`EZB antwortet mit Status ${res.status}`);
  const rate = parseEcbUsdRate(await res.text());
  if (rate === null) throw new Error("USD-Kurs im EZB-XML nicht gefunden");
  return { rate, fetchedAt: now, source: "ecb" };
}

let inflight: Promise<ExchangeRate | null> | null = null;

/**
 * USD je EUR. Reihenfolge: gespeicherter EZB-Kurs, wenn jünger als 24 h; sonst neuer EZB-Abruf;
 * bei Fehlern der alte gespeicherte Kurs; sonst USD_EUR_RATE aus der Umgebung; sonst null.
 */
export async function getUsdEurRate(db: DatabaseSync, options: RateOptions = {}): Promise<ExchangeRate | null> {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now();
  const maxAge = options.maxAgeMs ?? RATE_MAX_AGE_MS;
  const stored = readStored(db);
  if (stored && stored.source === "ecb" && now - stored.fetchedAt < maxAge) return stored;

  if (!inflight) {
    inflight = (async () => {
      try {
        const fresh = await fetchEcbRate(options.fetchImpl ?? fetch, now);
        store(db, fresh);
        return fresh;
      } catch (err) {
        console.warn(`[ki-text-analyzer] EZB-Wechselkurs konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`);
        return stored ?? envRate(env, now);
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

export function usdToEur(usd: number, rate: ExchangeRate): number {
  return usd / rate.rate;
}

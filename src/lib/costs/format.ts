// Ohne Node-Imports, damit Client-Komponenten formatieren können.
import type { ExchangeRate } from "./types";

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const usd = new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const eurPerMtok = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("de-DE");
const rateFormat = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

export function formatEur(value: number): string {
  return eur.format(value);
}

export function formatUsd(value: number): string {
  return usd.format(value);
}

/** Preis je 1 Mio. Token in Euro (oder USD ohne Kurs), zwei Nachkommastellen. */
export function formatPerMtok(usdValue: number, rate: ExchangeRate | null): string {
  return rate ? eurPerMtok.format(usdValue / rate.rate) : usd.format(usdValue);
}

export function formatTokens(n: number): string {
  return integer.format(n);
}

/** "2026-09" → "September 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(ts));
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
}

/** Kurzer Hinweis, woher der Kurs stammt. */
export function describeRate(rate: ExchangeRate | null): string {
  if (!rate) return "Kein Wechselkurs verfügbar, Beträge in USD.";
  const value = `1 € = ${rateFormat.format(rate.rate)} $`;
  return rate.source === "ecb" ? `EZB-Referenzkurs ${value} vom ${formatDate(rate.fetchedAt)}` : `Kurs ${value} aus USD_EUR_RATE`;
}

/** Betrag in Euro, ohne Kurs in USD. */
export function formatMoney(usdValue: number, rate: ExchangeRate | null): string {
  return rate ? formatEur(usdValue / rate.rate) : formatUsd(usdValue);
}

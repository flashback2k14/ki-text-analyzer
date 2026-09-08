import { describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth/users";
import { estimateCost, estimateTokens } from "@/lib/costs/estimate";
import { getUsdEurRate, parseEcbUsdRate, usdToEur } from "@/lib/costs/exchange";
import { describeRate, formatEur, formatMoney, formatMonth } from "@/lib/costs/format";
import { computeCostUsd, getPrice, listPrices, upsertPrice } from "@/lib/costs/prices";
import { PRICE_SEED } from "@/lib/costs/seed";
import { addUsage, EMPTY_USAGE, type ModelPrice, type UsageTotals } from "@/lib/costs/types";
import { monthlySummary, recentUsage, recordUsage } from "@/lib/costs/usage";
import { openDatabase } from "@/lib/db";

const opus: ModelPrice = { model: "claude-opus-5", label: "Claude Opus 5", inputUsdPerMtok: 5, outputUsdPerMtok: 25, cacheWriteUsdPerMtok: 6.25, cacheReadUsdPerMtok: 0.5, updatedAt: 0 };
const usage = (partial: Partial<UsageTotals>): UsageTotals => ({ ...EMPTY_USAGE, requests: 1, ...partial });

const ECB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <Cube><Cube time='2026-09-07'>
    <Cube currency='USD' rate='1.0842'/>
    <Cube currency='JPY' rate='171.03'/>
  </Cube></Cube>
</gesmes:Envelope>`;

describe("Migration und Preise", () => {
  it("legt die Preistabelle mit den Startwerten an", () => {
    const db = openDatabase(":memory:");
    const prices = listPrices(db);
    expect(prices).toHaveLength(PRICE_SEED.length);
    expect(getPrice(db, "claude-opus-5")).toMatchObject({ inputUsdPerMtok: 5, outputUsdPerMtok: 25, cacheWriteUsdPerMtok: 6.25, cacheReadUsdPerMtok: 0.5 });
    expect(getPrice(db, "claude-fable-5-1")?.cacheReadUsdPerMtok).toBe(0.25);
    expect(getPrice(db, "unbekannt")).toBeNull();
  });
  it("überschreibt geänderte Preise beim erneuten Öffnen nicht", () => {
    const db = openDatabase(":memory:");
    upsertPrice(db, { ...opus, inputUsdPerMtok: 9 });
    expect(getPrice(db, "claude-opus-5")?.inputUsdPerMtok).toBe(9);
    // Zweites Öffnen derselben Verbindung ist nicht möglich; die Seed-Anweisung ist aber INSERT OR IGNORE.
    db.exec("INSERT OR IGNORE INTO model_prices (model, label, input_usd_per_mtok, output_usd_per_mtok, cache_write_usd_per_mtok, cache_read_usd_per_mtok, updated_at) VALUES ('claude-opus-5', 'x', 1, 1, 1, 1, 0)");
    expect(getPrice(db, "claude-opus-5")?.inputUsdPerMtok).toBe(9);
  });
});

describe("computeCostUsd", () => {
  it("rechnet alle vier Token-Arten", () => {
    const cost = computeCostUsd(opus, usage({ inputTokens: 100_000, outputTokens: 10_000, cacheWriteTokens: 20_000, cacheReadTokens: 200_000 }));
    // 0,5 + 0,25 + 0,125 + 0,1
    expect(cost).toBeCloseTo(0.975, 6);
  });
  it("liefert null ohne Preis", () => {
    expect(computeCostUsd(null, usage({ inputTokens: 10 }))).toBeNull();
  });
  it("addiert Usage", () => {
    const sum = addUsage(usage({ inputTokens: 1, outputTokens: 2 }), usage({ inputTokens: 3, cacheReadTokens: 4 }));
    expect(sum).toEqual({ requests: 2, inputTokens: 4, outputTokens: 2, cacheWriteTokens: 0, cacheReadTokens: 4 });
  });
});

describe("estimateCost", () => {
  it("wächst mit Zeichen und Fundzahl und liefert eine Spanne", () => {
    const small = estimateCost({ suggestChars: 2000, assessChars: 5000, findingsCount: 5, assess: true }, opus)!;
    const more = estimateCost({ suggestChars: 20000, assessChars: 5000, findingsCount: 40, assess: true }, opus)!;
    expect(small.lowUsd).toBeLessThan(small.highUsd);
    expect(more.lowUsd).toBeGreaterThan(small.lowUsd);
    expect(more.inputTokens).toBeGreaterThan(small.inputTokens);
    const noAssess = estimateTokens({ suggestChars: 2000, assessChars: 5000, findingsCount: 5, assess: false });
    expect(noAssess.inputTokens).toBeLessThan(small.inputTokens);
    expect(noAssess.outputTokens).toBeLessThan(small.outputTokens);
  });
  it("gibt null ohne Preis", () => {
    expect(estimateCost({ suggestChars: 10, assessChars: 10, findingsCount: 1, assess: true }, null)).toBeNull();
  });
  it("rechnet mit null Fundstellen ohne Chunk-Overhead", () => {
    const t = estimateTokens({ suggestChars: 0, assessChars: 0, findingsCount: 0, assess: false });
    expect(t).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});

describe("Usage-Buchung und Monatsübersicht", () => {
  const ts = (iso: string) => new Date(iso).getTime();

  it("gruppiert nach Monat und Modell, absteigend", () => {
    const db = openDatabase(":memory:");
    const user = createUser(db, "a@b.de", "h");
    recordUsage(db, { userId: user.id, model: "claude-opus-5", purpose: "suggest", usage: usage({ inputTokens: 1000, outputTokens: 100 }), costUsd: 0.0075, createdAt: ts("2026-08-15T10:00:00"), fileName: "a.docx" });
    recordUsage(db, { userId: user.id, model: "claude-opus-5", purpose: "assess", usage: usage({ inputTokens: 500, outputTokens: 50 }), costUsd: 0.00375, createdAt: ts("2026-08-15T10:00:01") });
    recordUsage(db, { userId: user.id, model: "claude-sonnet-5", purpose: "suggest", usage: usage({ requests: 2, inputTokens: 2000, outputTokens: 300 }), costUsd: 0.007, createdAt: ts("2026-09-01T09:00:00") });
    recordUsage(db, { userId: user.id, model: "claude-x", purpose: "suggest", usage: usage({ inputTokens: 10 }), costUsd: null, createdAt: ts("2026-09-02T09:00:00") });

    const months = monthlySummary(db, user.id);
    expect(months.map((m) => m.month)).toEqual(["2026-09", "2026-08"]);
    expect(months[1]).toMatchObject({ runs: 2, requests: 2, inputTokens: 1500, outputTokens: 150, unpriced: false });
    expect(months[1].costUsd).toBeCloseTo(0.01125, 8);
    expect(months[1].byModel).toEqual([{ model: "claude-opus-5", runs: 2, requests: 2, costUsd: expect.closeTo(0.01125, 8), unpriced: false }]);
    expect(months[0]).toMatchObject({ runs: 2, requests: 3, unpriced: true });
    expect(months[0].byModel.map((b) => b.model)).toEqual(["claude-sonnet-5", "claude-x"]);

    const recent = recentUsage(db, user.id, 2);
    expect(recent.map((r) => r.model)).toEqual(["claude-x", "claude-sonnet-5"]);
    expect(recentUsage(db, user.id, 10).find((r) => r.fileName === "a.docx")?.purpose).toBe("suggest");
  });

  it("zeigt nur die Einträge des Users und löscht sie mit dem User", () => {
    const db = openDatabase(":memory:");
    const a = createUser(db, "a@b.de", "h");
    const b = createUser(db, "b@b.de", "h");
    recordUsage(db, { userId: a.id, model: "claude-opus-5", purpose: "suggest", usage: usage({ inputTokens: 1 }), costUsd: 0.001 });
    recordUsage(db, { userId: b.id, model: "claude-opus-5", purpose: "suggest", usage: usage({ inputTokens: 1 }), costUsd: 0.002 });
    expect(monthlySummary(db, a.id)).toHaveLength(1);
    expect(monthlySummary(db, a.id)[0].costUsd).toBeCloseTo(0.001, 8);
    db.prepare("DELETE FROM users WHERE id = ?").run(a.id);
    expect(monthlySummary(db, a.id)).toHaveLength(0);
    expect(monthlySummary(db, b.id)).toHaveLength(1);
  });
});

describe("Wechselkurs", () => {
  it("parst den USD-Kurs aus dem EZB-XML", () => {
    expect(parseEcbUsdRate(ECB_XML)).toBe(1.0842);
    expect(parseEcbUsdRate("<xml/>")).toBeNull();
  });

  it("holt den Kurs, speichert ihn und ruft innerhalb von 24 h nicht erneut ab", async () => {
    const db = openDatabase(":memory:");
    const fetchImpl = vi.fn(async () => new Response(ECB_XML, { status: 200 }));
    const now = ts("2026-09-07T12:00:00Z");
    const first = await getUsdEurRate(db, { fetchImpl: fetchImpl as unknown as typeof fetch, now, env: {} });
    expect(first).toEqual({ rate: 1.0842, fetchedAt: now, source: "ecb" });
    const second = await getUsdEurRate(db, { fetchImpl: fetchImpl as unknown as typeof fetch, now: now + 3600_000, env: {} });
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(usdToEur(2.1684, first!)).toBeCloseTo(2, 6);
  });

  it("fällt bei Abruffehlern auf den alten Kurs, dann auf USD_EUR_RATE, dann auf null zurück", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const db = openDatabase(":memory:");
    const old = await getUsdEurRate(db, { fetchImpl: (async () => new Response(ECB_XML)) as unknown as typeof fetch, now: 1000, env: {} });
    const stale = await getUsdEurRate(db, { fetchImpl: failing, now: 1000 + 48 * 3600_000, env: {} });
    expect(stale).toEqual(old);

    const empty = openDatabase(":memory:");
    const fromEnv = await getUsdEurRate(empty, { fetchImpl: failing, now: 5, env: { USD_EUR_RATE: "1,10" } });
    expect(fromEnv).toEqual({ rate: 1.1, fetchedAt: 5, source: "env" });

    const none = await getUsdEurRate(openDatabase(":memory:"), { fetchImpl: failing, now: 5, env: {} });
    expect(none).toBeNull();
    const bad = await getUsdEurRate(openDatabase(":memory:"), { fetchImpl: failing, now: 5, env: { USD_EUR_RATE: "abc" } });
    expect(bad).toBeNull();
    warn.mockRestore();
  });

  function ts(iso: string): number {
    return new Date(iso).getTime();
  }
});

describe("Formatierung", () => {
  it("formatiert Euro und Monate deutsch", () => {
    expect(formatEur(0.0123)).toMatch(/0,0123\s?€/);
    expect(formatEur(1.5)).toMatch(/1,50\s?€/);
    expect(formatMonth("2026-09")).toBe("September 2026");
    expect(formatMoney(1.0842, { rate: 1.0842, fetchedAt: 0, source: "ecb" })).toMatch(/1,00\s?€/);
    expect(formatMoney(2, null)).toMatch(/2,00\s?\$/);
    expect(describeRate(null)).toContain("USD");
    expect(describeRate({ rate: 1.08, fetchedAt: 0, source: "env" })).toContain("USD_EUR_RATE");
  });
});

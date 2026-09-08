import { getUsdEurRate } from "@/lib/costs/exchange";
import { describeRate, formatDateTime, formatMoney, formatMonth, formatTokens, formatUsd } from "@/lib/costs/format";
import { monthlySummary, recentUsage } from "@/lib/costs/usage";
import { getDb } from "@/lib/db";
import { modelLabel } from "@/lib/llm/models";

const PURPOSE_LABEL = { suggest: "Alternativen", assess: "Einschätzung" } as const;

function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function CostsSection({ userId }: { userId: string }) {
  const db = getDb();
  const months = monthlySummary(db, userId);
  const recent = recentUsage(db, userId, 10);
  const rate = await getUsdEurRate(db);
  const thisMonth = months.find((m) => m.month === currentMonthKey());

  const money = (usd: number) => (
    <span title={rate ? formatUsd(usd) : undefined} className="tabular-nums">
      {formatMoney(usd, rate)}
    </span>
  );

  return (
    <section aria-labelledby="costs-heading" className="rounded-xl border border-border bg-surface p-5">
      <h2 id="costs-heading" className="text-lg font-semibold">
        Kosten
      </h2>
      <p className="mt-1 text-sm text-muted">
        Jeder Claude-Durchlauf wird mit den tatsächlichen Token der API-Antwort gebucht. Gespeichert wird in US-Dollar, angezeigt in Euro.
      </p>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tabular-nums">{formatMoney(thisMonth?.costUsd ?? 0, rate)}</span>
        <span className="text-sm text-muted">im {formatMonth(currentMonthKey())}</span>
        {thisMonth?.unpriced && <span className="text-xs text-muted">(enthält Durchläufe ohne hinterlegten Preis)</span>}
      </div>

      {months.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Noch keine Claude-Aufrufe gebucht.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Monat</th>
                <th className="py-1 pr-3 text-right font-medium">Durchläufe</th>
                <th className="py-1 pr-3 text-right font-medium">Anfragen</th>
                <th className="py-1 pr-3 text-right font-medium">Eingabe-Token</th>
                <th className="py-1 pr-3 text-right font-medium">Ausgabe-Token</th>
                <th className="py-1 text-right font-medium">Kosten</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-t border-border align-top">
                  <td className="py-2 pr-3">
                    <details>
                      <summary className="cursor-pointer font-medium">{formatMonth(m.month)}</summary>
                      <ul className="mt-1 space-y-0.5 text-xs text-muted">
                        {m.byModel.map((bm) => (
                          <li key={bm.model} className="flex justify-between gap-3">
                            <span>
                              {modelLabel(bm.model)} · {bm.runs} {bm.runs === 1 ? "Durchlauf" : "Durchläufe"}
                              {bm.unpriced ? " · ohne Preis" : ""}
                            </span>
                            {money(bm.costUsd)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{m.runs}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{m.requests}</td>
                  <td className="py-2 pr-3 text-right tabular-nums" title={`davon Cache: ${formatTokens(m.cacheWriteTokens)} geschrieben, ${formatTokens(m.cacheReadTokens)} gelesen`}>
                    {formatTokens(m.inputTokens + m.cacheWriteTokens + m.cacheReadTokens)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatTokens(m.outputTokens)}</td>
                  <td className="py-2 text-right font-medium">
                    {money(m.costUsd)}
                    {m.unpriced && <span className="ml-1 text-xs font-normal text-muted">*</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {months.some((m) => m.unpriced) && <p className="mt-2 text-xs text-muted">* Enthält Durchläufe mit einem Modell ohne hinterlegten Preis; deren Token sind erfasst, der Betrag fehlt.</p>}
        </div>
      )}

      {recent.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted">Letzte Aufrufe</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-x-3 border-t border-border py-1">
                <span className="text-muted">{formatDateTime(r.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate" title={r.fileName ?? undefined}>
                  {r.fileName ?? "–"}
                </span>
                <span>
                  {modelLabel(r.model)} · {PURPOSE_LABEL[r.purpose]}
                </span>
                <span>{r.costUsd === null ? "ohne Preis" : money(r.costUsd)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-4 text-xs text-muted">{describeRate(rate)}</p>
    </section>
  );
}

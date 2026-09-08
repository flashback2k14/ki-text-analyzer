"use client";

import Link from "next/link";
import type { Score, Stats } from "@/lib/analysis/types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/analysis/types";
import type { RunUsage } from "@/lib/client-types";
import { describeRate, formatMoney, formatTokens, formatUsd } from "@/lib/costs/format";
import type { Assessment } from "@/lib/llm/suggest";

interface Props {
  fileName: string;
  score: Score;
  stats: Stats;
  llmAvailable: boolean;
  llmState: "idle" | "loading" | "done" | "error";
  llmError: string | null;
  llmModel: string | null;
  assessment: (Assessment & { truncated: boolean }) | null;
  runUsage: RunUsage | null;
  exporting: boolean;
  exportError: string | null;
  onLoadSuggestions: () => void;
  onExport: () => void;
  onReset: () => void;
}

function scoreColor(value: number): string {
  if (value >= 65) return "#dc2626";
  if (value >= 30) return "#d97706";
  return "#16a34a";
}

export function SummaryPanel(props: Props) {
  const { fileName, score, stats, llmAvailable, llmState, llmError, llmModel, assessment, runUsage, exporting, exportError } = props;
  const color = scoreColor(score.value);

  return (
    <section aria-label="Zusammenfassung" className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold" title={fileName}>
            {fileName}
          </h2>
          <p className="text-sm text-muted">
            {stats.words} Wörter · {stats.sentences} Sätze · {stats.paragraphs} Absätze · Ø {stats.avgSentenceLength} Wörter je Satz · {stats.dashesPer1000Words} Gedankenstriche je 1000 Wörter
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={props.onLoadSuggestions}
            disabled={!llmAvailable || llmState === "loading" || llmState === "done"}
            title={llmAvailable ? "Sendet die Fundstellen und den Text an die Anthropic API" : "Kein Anthropic-API-Key hinterlegt"}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {llmState === "loading" ? "Claude arbeitet …" : llmState === "done" ? "Alternativen geladen" : "Alternativen mit Claude laden"}
          </button>
          <button
            type="button"
            onClick={props.onExport}
            disabled={exporting}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-background disabled:opacity-50"
          >
            {exporting ? "Export läuft …" : "Als docx mit Kommentaren exportieren"}
          </button>
          <button type="button" onClick={props.onReset} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background">
            Neue Datei
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums" style={{ color }}>
              {score.value}
            </span>
            <span className="text-sm text-muted">von 100</span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ background: color }}>
              {score.label}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score.value} aria-label="KI-Verdachtswert">
            <div className="h-full rounded-full transition-all" style={{ width: `${score.value}%`, background: color }} />
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {score.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true" className="text-muted">
                  ·
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Kein einzelnes Merkmal beweist maschinelle Herkunft; verdächtig ist die Häufung. Ein Text ohne diese Muster kann trotzdem von einer Maschine stammen, ein Text mit einigen davon von einem Menschen.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Funde je Kategorie</p>
          <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c} className={`flex justify-between ${stats.findingsPerCategory[c] === 0 ? "text-muted" : ""}`}>
                <span>{CATEGORY_LABELS[c]}</span>
                <span className="tabular-nums">{stats.findingsPerCategory[c]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(llmError || exportError) && (
        <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {llmError ?? exportError}
        </p>
      )}
      {!llmAvailable && (
        <p className="mt-4 text-xs text-muted">
          Kein Anthropic-API-Key hinterlegt. Alternativen vom Sprachmodell und die Gesamteinschätzung sind deaktiviert; die Regel-Analyse funktioniert weiterhin. Unter{" "}
          <Link href="/konto" className="text-accent hover:underline">
            Konto
          </Link>{" "}
          kannst du einen eigenen Key speichern.
        </p>
      )}

      {runUsage && (
        <p className="mt-4 text-sm" aria-label="Kosten dieses Durchlaufs">
          <span className="font-medium">Dieser Durchlauf:</span>{" "}
          {runUsage.costUsd !== null ? (
            <>
              {formatMoney(runUsage.costUsd, runUsage.rate)}
              {runUsage.rate && <span className="text-muted"> ({formatUsd(runUsage.costUsd)})</span>}
            </>
          ) : (
            <span className="text-muted">kein Preis für „{runUsage.model}“ hinterlegt</span>
          )}
          <span className="text-muted">
            {" "}
            · {runUsage.model} · {formatTokens(runUsage.tokens.inputTokens + runUsage.tokens.cacheWriteTokens + runUsage.tokens.cacheReadTokens)} Eingabe- und {formatTokens(runUsage.tokens.outputTokens)} Ausgabe-Token in {runUsage.tokens.requests}{" "}
            {runUsage.tokens.requests === 1 ? "Anfrage" : "Anfragen"}
            {runUsage.costUsd !== null ? ` · ${describeRate(runUsage.rate)}` : ""} · Übersicht unter{" "}
            <Link href="/konto" className="underline hover:text-accent">
              Konto
            </Link>
          </span>
        </p>
      )}

      {assessment && (
        <div className="mt-5 rounded-lg border border-accent/40 bg-accent/5 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Einschätzung des Sprachmodells{llmModel ? ` (${llmModel})` : ""}</p>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">Wahrscheinlichkeit: {assessment.wahrscheinlichkeit}</span>
          </div>
          <p className="mt-2 leading-relaxed">{assessment.einschaetzung}</p>
          {assessment.auffaelligkeiten.length > 0 && (
            <>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted">Auffälligkeiten</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {assessment.auffaelligkeiten.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          {assessment.staerken.length > 0 && (
            <>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted">Spricht für menschlichen Ursprung</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {assessment.staerken.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          {assessment.truncated && <p className="mt-2 text-xs text-muted">Der Text wurde für die Einschätzung auf Anfang, Mitte und Ende gekürzt.</p>}
        </div>
      )}
    </section>
  );
}

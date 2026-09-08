"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiError, LlmModelOption, LlmOptionsResponse } from "@/lib/client-types";
import { estimateCost } from "@/lib/costs/estimate";
import { describeRate, formatMoney, formatPerMtok, formatTokens } from "@/lib/costs/format";
import { MODEL_ID_PATTERN } from "@/lib/llm/models";
import { primaryButton, secondaryButton } from "./FormField";

interface Props {
  onClose: () => void;
  onStart: (model: string) => void;
  /** Zeichen aller Absätze, die mit den Fundstellen mitgeschickt werden. */
  suggestChars: number;
  /** Zeichen des Volltexts für die Einschätzung. */
  assessChars: number;
  findingsCount: number;
}

const selectClass = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Wird vom Elternteil nur gerendert, solange der Dialog offen ist. Beim Einhängen öffnet er sich
 * und lädt die Optionen frisch (die Konto-Einstellung kann sich geändert haben).
 */
export function ClaudeDialog({ onClose, onStart, suggestChars, assessChars, findingsCount }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<LlmOptionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/llm/options");
        if (!res.ok) {
          let message = `Modelle konnten nicht geladen werden (Status ${res.status}).`;
          try {
            message = ((await res.json()) as ApiError).error || message;
          } catch {
            /* keine JSON-Antwort */
          }
          throw new Error(message);
        }
        const data = (await res.json()) as LlmOptionsResponse;
        if (cancelled) return;
        setOptions(data);
        setChoice(data.defaultModel);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Modelle konnten nicht geladen werden.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedModel = choice === "custom" ? custom.trim() : choice;
  const selected: LlmModelOption | undefined = options?.models.find((m) => m.id === selectedModel);
  const customValid = choice !== "custom" || MODEL_ID_PATTERN.test(custom.trim());
  const rate = options?.rate ?? null;

  const estimate = useMemo(
    () => (selected ? estimateCost({ suggestChars, assessChars, findingsCount, assess: true }, selected.price) : null),
    [selected, suggestChars, assessChars, findingsCount],
  );

  const canStart = Boolean(options && options.llmAvailable && selectedModel && customValid);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="claude-dialog-title"
      className="m-auto w-[min(92vw,34rem)] rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <form
        method="dialog"
        className="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canStart) onStart(selectedModel);
        }}
      >
        <h2 id="claude-dialog-title" className="text-lg font-semibold">
          Alternativen mit Claude laden
        </h2>
        <p className="mt-1 text-sm text-muted">
          {findingsCount} Fundstellen mit ihren Absätzen und der vollständige Text werden an die Anthropic API gesendet. Die Kosten laufen über den hinterlegten API-Key und werden im Konto erfasst.
        </p>

        {loadError && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{loadError}</p>}
        {options && !options.llmAvailable && <p className="mt-3 text-sm text-red-700 dark:text-red-300">Kein Anthropic-API-Key hinterlegt. Unter „Konto“ kannst du einen Key speichern.</p>}

        <div className="mt-4">
          <label htmlFor="dialogModel" className="block text-sm font-medium">
            KI-Modell für diesen Durchlauf
          </label>
          <select id="dialogModel" value={choice} onChange={(e) => setChoice(e.target.value)} disabled={!options} className={selectClass}>
            {!options && <option value="">Lade Modelle …</option>}
            {options?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.id === options.defaultModel ? " (Konto-Einstellung)" : ""} – {m.hinweis}
              </option>
            ))}
            {options && <option value="custom">Eigene Modell-ID …</option>}
          </select>
          {choice === "custom" && (
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="claude-…"
              aria-label="Modell-ID"
              aria-invalid={!customValid || undefined}
              className={`${selectClass} ${!customValid && custom ? "border-red-400" : ""}`}
            />
          )}
          <p className="mt-1 text-xs text-muted">Vorbelegt mit dem Modell aus den Konto-Einstellungen. Die Auswahl hier gilt nur für diesen Durchlauf.</p>
        </div>

        <div className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-sm">
          {selected?.price ? (
            <>
              <p>
                Preis je 1 Mio. Token: Eingabe {formatPerMtok(selected.price.inputUsdPerMtok, rate)}, Ausgabe {formatPerMtok(selected.price.outputUsdPerMtok, rate)}
              </p>
              {estimate && (
                <p className="mt-1 font-medium">
                  Geschätzte Kosten: ca. {formatMoney(estimate.lowUsd, rate)} bis {formatMoney(estimate.highUsd, rate)}
                  <span className="ml-1 font-normal text-muted">
                    (etwa {formatTokens(estimate.inputTokens)} Eingabe- und {formatTokens(estimate.outputTokens)} Ausgabe-Token)
                  </span>
                </p>
              )}
              <p className="mt-1 text-xs text-muted">Schätzung aus der Textlänge. Gebucht werden die tatsächlichen Token der API-Antwort. {describeRate(rate)}</p>
            </>
          ) : selectedModel ? (
            <p className="text-muted">Für „{selectedModel}“ ist kein Preis hinterlegt. Token werden erfasst, aber ohne Betrag.</p>
          ) : (
            <p className="text-muted">Bitte ein Modell wählen.</p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Abbrechen
          </button>
          <button type="submit" disabled={!canStart} className={primaryButton}>
            Alternativen laden
          </button>
        </div>
      </form>
    </dialog>
  );
}

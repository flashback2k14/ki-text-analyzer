"use client";

import { useState } from "react";
import type { Finding, Paragraph } from "@/lib/analysis/types";
import { CATEGORY_LABELS } from "@/lib/analysis/types";
import { CATEGORY_COLOR_VAR, SEVERITY_LABEL } from "./categories";
import type { CSSProperties } from "react";

interface Props {
  finding: Finding | null;
  paragraph: Paragraph | null;
  position: { index: number; total: number } | null;
  onPrev: () => void;
  onNext: () => void;
  llmState: "idle" | "loading" | "done" | "error";
}

export function FindingPanel({ finding, paragraph, position, onPrev, onNext, llmState }: Props) {
  const [copied, setCopied] = useState(false);

  if (!finding) {
    return (
      <aside aria-label="Hinweisfeld" className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
        <p className="font-medium text-foreground">Hinweisfeld</p>
        <p className="mt-2">Eine Markierung im Text anklicken, um Erklärung und alternative Formulierung zu sehen.</p>
      </aside>
    );
  }

  const style = { "--mark-bg": CATEGORY_COLOR_VAR[finding.category] } as CSSProperties;
  const copy = async () => {
    if (!finding.suggestion) return;
    try {
      await navigator.clipboard.writeText(finding.suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside aria-label="Hinweisfeld" aria-live="polite" className="rounded-xl border border-border bg-surface p-5 text-sm" style={style}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--mark-bg)" }} />
          {CATEGORY_LABELS[finding.category]}
        </span>
        <span className="text-xs text-muted">
          {SEVERITY_LABEL[finding.severity]}
          {position ? ` · ${position.index + 1}/${position.total}` : ""}
        </span>
      </div>

      <p className="mt-3 text-xs uppercase tracking-wide text-muted">{finding.ruleName}</p>
      <p className="mt-1 leading-relaxed">{finding.message}</p>

      <p className="mt-4 text-xs uppercase tracking-wide text-muted">Originalstelle</p>
      <blockquote className="mt-1 rounded-md border border-border bg-background px-3 py-2 leading-relaxed">
        <mark className="finding" style={style}>
          {finding.matchedText}
        </mark>
      </blockquote>

      <p className="mt-4 text-xs uppercase tracking-wide text-muted">
        Alternative Formulierung
        {finding.suggestionSource === "llm" && <span className="ml-1 normal-case text-accent">(Claude)</span>}
        {finding.suggestionSource === "rule" && <span className="ml-1 normal-case">(Regelvorschlag)</span>}
      </p>
      {finding.suggestion ? (
        <div className="mt-1 rounded-md border border-accent/40 bg-accent/5 px-3 py-2 leading-relaxed">
          <p>{finding.suggestion}</p>
          {finding.suggestionReason && <p className="mt-2 text-xs text-muted">{finding.suggestionReason}</p>}
        </div>
      ) : (
        <p className="mt-1 text-muted">
          {llmState === "loading" ? "Wird vom Sprachmodell erarbeitet …" : "Kein fester Vorschlag. „Alternativen mit Claude laden“ liefert eine Umformulierung."}
        </p>
      )}
      {llmState === "loading" && finding.suggestionSource === "rule" && <p className="mt-1 text-xs text-muted">Genauere Alternative vom Sprachmodell wird geladen …</p>}

      {paragraph && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted">Ganzer Absatz</summary>
          <p className="mt-1 leading-relaxed text-muted">{paragraph.text}</p>
        </details>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onPrev} className="rounded-md border border-border px-3 py-1.5 hover:bg-background">
          ← Vorheriger
        </button>
        <button type="button" onClick={onNext} className="rounded-md border border-border px-3 py-1.5 hover:bg-background">
          Nächster →
        </button>
        <button type="button" onClick={copy} disabled={!finding.suggestion} className="rounded-md border border-border px-3 py-1.5 hover:bg-background disabled:opacity-50">
          {copied ? "Kopiert" : "Alternative kopieren"}
        </button>
      </div>
    </aside>
  );
}

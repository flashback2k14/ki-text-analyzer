"use client";

import { useMemo } from "react";
import type { Category, Finding, Paragraph } from "@/lib/analysis/types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/analysis/types";
import { CATEGORY_COLOR_VAR } from "./categories";
import { HighlightedParagraph } from "./HighlightedParagraph";
import type { CSSProperties } from "react";

interface Props {
  paragraphs: Paragraph[];
  findings: Finding[];
  hidden: Set<Category>;
  onToggleCategory: (c: Category) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DocumentView({ paragraphs, findings, hidden, onToggleCategory, selectedId, onSelect }: Props) {
  const visible = useMemo(() => findings.filter((f) => !hidden.has(f.category)), [findings, hidden]);
  const byParagraph = useMemo(() => {
    const map = new Map<number, Finding[]>();
    for (const f of visible) {
      const list = map.get(f.paragraphIndex) ?? [];
      list.push(f);
      map.set(f.paragraphIndex, list);
    }
    return map;
  }, [visible]);
  const counts = useMemo(() => {
    const c = new Map<Category, number>();
    for (const f of findings) c.set(f.category, (c.get(f.category) ?? 0) + 1);
    return c;
  }, [findings]);

  return (
    <section aria-label="Dokument mit Markierungen" className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3" role="group" aria-label="Kategorien ein- und ausblenden">
        {CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0).map((c) => {
          const off = hidden.has(c);
          const style = { "--mark-bg": CATEGORY_COLOR_VAR[c] } as CSSProperties;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={!off}
              onClick={() => onToggleCategory(c)}
              style={style}
              className={`inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-opacity ${off ? "opacity-40 line-through" : ""}`}
            >
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--mark-bg)" }} />
              {CATEGORY_LABELS[c]}
              <span className="text-muted">{counts.get(c)}</span>
            </button>
          );
        })}
        {findings.length === 0 && <span className="text-sm text-muted">Keine Fundstellen.</span>}
      </div>
      <div className="px-5 py-4 text-[15px]">
        {paragraphs.map((p) =>
          p.text.trim().length === 0 ? (
            <div key={p.index} className="h-3" aria-hidden="true" />
          ) : (
            <HighlightedParagraph key={p.index} paragraph={p} findings={byParagraph.get(p.index) ?? []} selectedId={selectedId} onSelect={onSelect} />
          ),
        )}
      </div>
    </section>
  );
}

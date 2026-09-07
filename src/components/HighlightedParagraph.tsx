"use client";

import type { Finding, Paragraph } from "@/lib/analysis/types";
import { CATEGORY_LABELS } from "@/lib/analysis/types";
import { CATEGORY_COLOR_VAR } from "./categories";
import type { CSSProperties } from "react";

interface Props {
  paragraph: Paragraph;
  findings: Finding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type Segment = { text: string; finding?: Finding };

/** Zerlegt den Absatztext in markierte und unmarkierte Segmente (Funde überlappen nach dedupe nicht). */
function segments(text: string, findings: Finding[]): Segment[] {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const f of sorted) {
    const start = Math.max(f.start, pos);
    const end = Math.min(f.end, text.length);
    if (end <= start) continue;
    if (start > pos) out.push({ text: text.slice(pos, start) });
    out.push({ text: text.slice(start, end), finding: f });
    pos = end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

export function HighlightedParagraph({ paragraph, findings, selectedId, onSelect }: Props) {
  const parts = segments(paragraph.text, findings);
  const content = parts.map((s, i) => {
    if (!s.finding) return <span key={i}>{s.text}</span>;
    const f = s.finding;
    const style = { "--mark-bg": CATEGORY_COLOR_VAR[f.category] } as CSSProperties;
    return (
      <mark
        key={i}
        id={`finding-${f.id}`}
        className={`finding${selectedId === f.id ? " selected" : ""}`}
        style={style}
        tabIndex={0}
        role="button"
        aria-label={`${CATEGORY_LABELS[f.category]}: ${f.message}`}
        aria-pressed={selectedId === f.id}
        title={`${CATEGORY_LABELS[f.category]} – ${f.ruleName}`}
        onClick={() => onSelect(f.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(f.id);
          }
        }}
      >
        {s.text}
      </mark>
    );
  });

  if (paragraph.isHeading) {
    return <h3 className="mt-6 mb-2 text-lg font-semibold leading-snug first:mt-0">{content}</h3>;
  }
  if (paragraph.isListItem) {
    return (
      <p className="my-1 pl-6 leading-relaxed before:absolute before:-ml-4 before:content-['•'] relative">
        {content}
      </p>
    );
  }
  return <p className="my-3 leading-relaxed whitespace-pre-wrap">{content}</p>;
}

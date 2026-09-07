import type { Category, Finding, Paragraph, Severity } from "../types";

export interface RuleContext {
  paragraphs: Paragraph[];
  /** Nur nicht-leere Absätze. */
  textParagraphs: Paragraph[];
  totalWords: number;
}

export type RawFinding = Omit<Finding, "id" | "ruleId" | "ruleName" | "category" | "severity"> & {
  severity?: Severity;
  category?: Category;
};

export interface Rule {
  id: string;
  name: string;
  category: Category;
  severity: Severity;
  run(ctx: RuleContext): RawFinding[];
}

export interface PhrasePattern {
  /** Regex-Quelle ohne Flags; wird mit Wortgrenzen und Flags "giu" kompiliert. */
  pattern: string;
  message: string;
  suggestion?: string;
  severity?: Severity;
}

/** Wortgrenze, die auch vor/nach Umlauten funktioniert (\b kennt keine Unicode-Buchstaben). */
const LB = "(?<![\\p{L}\\p{N}])";
const RB = "(?![\\p{L}\\p{N}])";

export function compilePhrase(p: PhrasePattern): RegExp {
  return new RegExp(`${LB}(?:${p.pattern})${RB}`, "giu");
}

/** Sucht alle Phrasen in allen Textabsätzen. */
export function findPhrases(ctx: RuleContext, patterns: PhrasePattern[], defaults: { severity: Severity }): RawFinding[] {
  const out: RawFinding[] = [];
  const compiled = patterns.map((p) => ({ p, re: compilePhrase(p) }));
  for (const para of ctx.textParagraphs) {
    for (const { p, re } of compiled) {
      re.lastIndex = 0;
      for (const m of para.text.matchAll(re)) {
        const start = m.index ?? 0;
        out.push({
          paragraphIndex: para.index,
          start,
          end: start + m[0].length,
          matchedText: m[0],
          message: p.message,
          suggestion: p.suggestion,
          suggestionSource: p.suggestion ? "rule" : undefined,
          severity: p.severity ?? defaults.severity,
        });
      }
    }
  }
  return out;
}

export function makeFinding(para: Paragraph, start: number, end: number, message: string, extra: Partial<RawFinding> = {}): RawFinding {
  return {
    paragraphIndex: para.index,
    start,
    end,
    matchedText: para.text.slice(start, end),
    message,
    suggestionSource: extra.suggestion ? "rule" : undefined,
    ...extra,
  };
}

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu);
  return m ? m.length : 0;
}

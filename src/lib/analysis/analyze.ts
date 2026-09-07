import { RULES, type RuleContext } from "./rules";
import { countWords } from "./rules/rule";
import { computeScore } from "./score";
import { CATEGORIES, type AnalysisResult, type Category, type Finding, type Paragraph, type Stats } from "./types";

function countSentences(text: string): number {
  const m = text.match(/[^.!?…]+[.!?…]+(?:\s|$)/gu);
  if (m && m.length > 0) return m.length;
  return text.trim().length > 0 ? 1 : 0;
}

export function computeStats(paragraphs: Paragraph[], findings: Finding[]): Stats {
  const textParas = paragraphs.filter((p) => p.text.trim().length > 0);
  let words = 0;
  let sentences = 0;
  let dashes = 0;
  for (const p of textParas) {
    words += countWords(p.text);
    sentences += p.isHeading ? 0 : countSentences(p.text);
    dashes += (p.text.match(/(?<!\d)[–—](?!\d)/g) ?? []).length;
  }
  const findingsPerCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const f of findings) findingsPerCategory[f.category]++;
  return {
    words,
    sentences,
    paragraphs: textParas.length,
    avgSentenceLength: sentences ? Math.round((words / sentences) * 10) / 10 : 0,
    dashesPer1000Words: words ? Math.round((dashes / words) * 10000) / 10 : 0,
    findingsPerCategory,
  };
}

/** Überlappende Funde im selben Absatz auflösen: höhere Severity gewinnt, bei Gleichstand der längere. */
function dedupe(findings: Finding[], paragraphs: Paragraph[]): Finding[] {
  const sorted = [...findings].sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.start - b.start || b.end - a.end);
  const kept: Finding[] = [];
  const coversWholeParagraph = (f: Finding) => f.start === 0 && f.end >= paragraphs[f.paragraphIndex].text.length;
  for (const f of sorted) {
    const overlapIdx = kept.findIndex((k) => k.paragraphIndex === f.paragraphIndex && f.start < k.end && k.start < f.end);
    if (overlapIdx < 0) {
      kept.push(f);
      continue;
    }
    const k = kept[overlapIdx];
    // Ein Ganz-Absatz-Fund (z. B. Überschrift, Inline-Header-Liste) darf neben einem Phrasenfund anderer Kategorie bestehen.
    if (k.category !== f.category && (coversWholeParagraph(k) !== coversWholeParagraph(f))) {
      kept.push(f);
      continue;
    }
    const fScore = f.severity * 1000 + (f.end - f.start);
    const kScore = k.severity * 1000 + (k.end - k.start);
    if (fScore > kScore) kept[overlapIdx] = f;
  }
  return kept.sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.start - b.start);
}

export function analyzeParagraphs(paragraphs: Paragraph[]): AnalysisResult {
  const textParagraphs = paragraphs.filter((p) => p.text.trim().length > 0);
  const totalWords = textParagraphs.reduce((n, p) => n + countWords(p.text), 0);
  const ctx: RuleContext = { paragraphs, textParagraphs, totalWords };

  const raw: Finding[] = [];
  for (const rule of RULES) {
    for (const f of rule.run(ctx)) {
      raw.push({
        ...f,
        id: "",
        ruleId: rule.id,
        ruleName: rule.name,
        category: f.category ?? rule.category,
        severity: f.severity ?? rule.severity,
      });
    }
  }

  const findings = dedupe(raw, paragraphs).map((f, i) => ({ ...f, id: `f${i + 1}` }));
  const stats = computeStats(paragraphs, findings);
  const score = computeScore(findings, stats, textParagraphs);
  return { paragraphs, findings, stats, score };
}

/** Bequemer Einstieg für reinen Text (Absätze durch Leerzeilen getrennt), z. B. für Tests. */
export function analyzeText(text: string): AnalysisResult {
  const paragraphs: Paragraph[] = text.split(/\n{2,}|\r\n{2,}/).map((t, index) => ({
    index,
    text: t.replace(/\s*\n\s*/g, " ").trim(),
    isHeading: false,
    isListItem: false,
    runs: [{ text: t.trim(), bold: false }],
  }));
  return analyzeParagraphs(paragraphs);
}

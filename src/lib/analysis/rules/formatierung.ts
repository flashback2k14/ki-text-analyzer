import { makeFinding, type RawFinding, type Rule } from "./rule";

const EMOJI_START = /^\s*(?:[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}][️‍]?)+/u;
const EMOJI_ANY = /[\p{Extended_Pictographic}]/u;

export const formatierungRule: Rule = {
  id: "formatierung",
  name: "Formatierungsmuster",
  category: "formatierung",
  severity: 2,
  run: (ctx) => {
    const out: RawFinding[] = [];

    // Inline-Header-Listen: Absatz beginnt mit fettem Run, der mit ":" endet.
    const inlineHeaders: RawFinding[] = [];
    let boldLeadCount = 0;
    for (const para of ctx.textParagraphs) {
      if (para.isHeading) continue;
      const firstRun = para.runs.find((r) => r.text.trim().length > 0);
      if (!firstRun || !firstRun.bold) continue;
      const lead = firstRun.text;
      const leadEnd = para.text.indexOf(lead) + lead.length;
      const trimmed = lead.trimEnd();
      const followedByColon = trimmed.endsWith(":") || para.text.slice(leadEnd).trimStart().startsWith(":");
      const restLength = para.text.length - leadEnd;
      if (followedByColon && restLength > 3 && trimmed.length <= 60) {
        inlineHeaders.push(
          makeFinding(para, 0, Math.min(para.text.length, leadEnd + (trimmed.endsWith(":") ? 0 : 1)), "", {
            severity: 2,
            suggestion: "Fettes Schlagwort und Doppelpunkt entfernen; den Punkt als vollständigen Satz schreiben.",
          }),
        );
      } else if (restLength > 3 && trimmed.length <= 40) {
        boldLeadCount++;
      }
    }
    if (inlineHeaders.length >= 2) {
      out.push(
        ...inlineHeaders.map((f) => ({
          ...f,
          message: `Inline-Header-Liste („fettes Schlagwort: Erklärung“), ${inlineHeaders.length}-mal im Dokument. Eines der auffälligsten KI-Formatmuster.`,
          severity: (inlineHeaders.length >= 4 ? 3 : 2) as 2 | 3,
        })),
      );
    }

    // Häufung fetter Schlagwörter innerhalb von Fließtext
    let boldFragments = 0;
    for (const para of ctx.textParagraphs) {
      if (para.isHeading || para.isListItem) continue;
      const bolds = para.runs.filter((r) => r.bold && r.text.trim().length > 0 && r.text.trim().length < 40);
      const nonBold = para.runs.some((r) => !r.bold && r.text.trim().length > 20);
      if (bolds.length >= 2 && nonBold) boldFragments += bolds.length;
    }
    if (boldFragments >= 6 || boldLeadCount >= 4) {
      // Ein Dokumentfund am ersten betroffenen Absatz
      const first = ctx.textParagraphs.find((p) => p.runs.some((r) => r.bold) && !p.isHeading);
      if (first) {
        out.push(
          makeFinding(first, 0, first.text.length, "Häufiger Fettdruck einzelner Schlagwörter im Fließtext, ein typisches KI-Formatmuster.", {
            severity: 1,
            suggestion: "Fettdruck auf wenige, wirklich zentrale Begriffe beschränken.",
          }),
        );
      }
    }

    // Emojis am Anfang von Überschriften oder Listenpunkten, Emojis generell
    for (const para of ctx.textParagraphs) {
      const m = para.text.match(EMOJI_START);
      if (m) {
        out.push(
          makeFinding(para, 0, m[0].length, "Emoji am Anfang einer Überschrift bzw. eines Absatzes.", {
            severity: 2,
            suggestion: "Emoji entfernen.",
          }),
        );
      } else if (EMOJI_ANY.test(para.text)) {
        const idx = para.text.search(EMOJI_ANY);
        const ch = para.text.codePointAt(idx) ?? 0;
        out.push(
          makeFinding(para, idx, idx + (ch > 0xffff ? 2 : 1), "Emoji in einem sachlichen Text.", {
            severity: 1,
            suggestion: "Emoji entfernen.",
          }),
        );
      }
    }

    return out;
  },
};

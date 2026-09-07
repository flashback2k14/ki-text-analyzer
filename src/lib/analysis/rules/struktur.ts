import { findPhrases, makeFinding, type PhrasePattern, type RawFinding, type Rule } from "./rule";

const FAZIT_HEADING = /^\s*(?:\d+[.)]?\s*)?(?:Fazit|Zusammenfassung|Schlussfolgerung|Schlussfolgerungen|Resümee|Schlusswort|Ausblick|Herausforderungen(?: und Ausblick| und Chancen| und Perspektiven)?|Zukunftsaussichten|Zukunftsperspektiven|Vermächtnis|Bedeutung und Vermächtnis)\s*:?\s*$/iu;

const FAZIT_PHRASEN: PhrasePattern[] = [
  { pattern: "zusammenfassend (?:lässt|läßt) sich (?:sagen|festhalten|feststellen)(?:, dass)?", message: "Fazit-Baustein. Sachliche Gebrauchstexte brauchen keine schließende Wiederholung.", suggestion: "Absatz streichen oder die Kernaussage an den Anfang stellen." },
  { pattern: "abschließend (?:lässt|läßt) sich (?:sagen|festhalten|feststellen)(?:, dass)?", message: "Fazit-Baustein.", suggestion: "Absatz streichen oder Kernaussage an den Anfang stellen." },
  { pattern: "(?:insgesamt|alles in allem|unterm Strich|letztendlich|letztlich) (?:zeigt sich|lässt sich (?:sagen|festhalten)|bleibt festzuhalten|kann man sagen)", message: "Fazit-Baustein.", suggestion: "Streichen." },
  { pattern: "trotz (?:seiner|ihrer|dieser|aller) Erfolge (?:steht|stehen|sieht sich|bleibt|bleiben)", message: "Schematischer Baustein „Herausforderungen und Ausblick“, ein starker KI-Verräter.", suggestion: "Konkrete Probleme dort nennen, wo sie inhaltlich hingehören, ohne Formel." },
  { pattern: "(?:steht|stehen|sieht sich|sehen sich) (?:jedoch |allerdings |noch |weiterhin )?vor (?:mehreren|einigen|großen|zahlreichen|erheblichen|neuen) Herausforderungen", message: "Baustein „Herausforderungen und Ausblick“.", suggestion: "Die Probleme konkret benennen." },
  { pattern: "die (?:Zukunft|Zukunftsaussichten|Perspektiven|Aussichten) (?:bleibt|bleiben|sind|ist|erscheint|erscheinen) (?:jedoch |dennoch |allerdings )?(?:vielversprechend|ungewiss|offen|positiv|rosig)", message: "Schematischer Ausblick-Satz.", suggestion: "Streichen oder ein konkretes, geplantes Vorhaben nennen." },
  { pattern: "(?:es bleibt|bleibt) (?:abzuwarten|spannend zu sehen|spannend)(?:, (?:ob|wie|wann))?", message: "Leerer Ausblick-Satz.", suggestion: "Streichen." },
  { pattern: "in (?:den kommenden|den nächsten|zukünftigen) Jahren (?:wird|dürfte|könnte|werden) [^.;!?]{1,40}? (?:weiter )?(?:an Bedeutung gewinnen|zunehmen|wachsen)", message: "Schematische Prognoseformel.", suggestion: "Streichen oder konkrete, belegte Erwartung nennen." },
];

const TITLE_CASE_WORD = /^[\p{Lu}][\p{Ll}]+$/u;
const LOWERCASE_FUNCTION_WORDS = new Set([
  "der", "die", "das", "des", "dem", "den", "ein", "eine", "einer", "eines", "einem", "einen",
  "und", "oder", "aber", "im", "in", "am", "an", "auf", "für", "mit", "von", "vom", "zu", "zum", "zur", "bei", "beim",
  "über", "unter", "durch", "nach", "vor", "aus", "um", "als", "wie", "bis", "ohne", "gegen", "ist", "sind", "wird",
  "werden", "hat", "haben", "kann", "können", "sich", "nicht", "auch", "so", "wichtigsten", "besten", "neuen",
  "ersten", "digitale", "digitalen", "ihre", "ihr", "sein", "seine", "unsere", "unser", "eure", "euer", "diese", "dieser",
  "dieses", "alle", "aller", "jede", "jeder", "jedes", "viele", "vieler", "mehr", "weniger", "besser", "gut", "neue", "neuer",
]);

export const strukturRule: Rule = {
  id: "struktur",
  name: "Struktur-Bausteine",
  category: "struktur",
  severity: 3,
  run: (ctx) => {
    const out: RawFinding[] = findPhrases(ctx, FAZIT_PHRASEN, { severity: 3 });
    const paras = ctx.textParagraphs;
    for (let i = 0; i < paras.length; i++) {
      const para = paras[i];
      const short = para.text.trim().length <= 60;
      if ((para.isHeading || short) && FAZIT_HEADING.test(para.text)) {
        const word = para.text.trim().toLowerCase();
        const isChallenge = /herausforderung|zukunft|vermächtnis|ausblick/.test(word);
        out.push(
          makeFinding(
            para,
            0,
            para.text.length,
            isChallenge
              ? "Schematischer Baustein „Herausforderungen und Ausblick“ bzw. „Vermächtnis“, ein starker KI-Verräter."
              : "Abschließender „Fazit“-Abschnitt. Das ist der Stil wissenschaftlicher Aufsätze, nicht sachlicher Gebrauchstexte.",
            {
              suggestion: isChallenge
                ? "Abschnitt auflösen und konkrete Probleme dort erwähnen, wo sie inhaltlich hingehören."
                : "Abschnitt streichen; eine Zusammenfassung gehört, wenn überhaupt, an den Anfang.",
              severity: 3,
            },
          ),
        );
      }
      if (para.isHeading) {
        // Englische Titel-Großschreibung: mehrere Funktionswörter großgeschrieben.
        const words = para.text.trim().split(/\s+/);
        if (words.length >= 3) {
          const capsFunction = words.slice(1).filter((w) => TITLE_CASE_WORD.test(w) && LOWERCASE_FUNCTION_WORDS.has(w.toLowerCase()));
          if (capsFunction.length >= 2) {
            out.push(
              makeFinding(para, 0, para.text.length, "Überschrift nach englischem Muster mit Titel-Großschreibung (jedes Wort groß).", {
                suggestion: "Im Deutschen normal groß- und kleinschreiben, z. B. „" + words.map((w, idx) => (idx > 0 && LOWERCASE_FUNCTION_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w)).join(" ") + "“.",
                severity: 2,
              }),
            );
          }
        }
        // Zweiteilige Marketing-Überschrift „X: Warum Y …“
        if (/^[^:]{3,60}:\s*(?:Warum|Wie|Was|Wann|Der Schlüssel|Ein Blick|Mehr als)\b/u.test(para.text)) {
          out.push(
            makeFinding(para, 0, para.text.length, "Zweiteilige Marketing-Überschrift mit Doppelpunkt und Frage.", {
              suggestion: "Überschrift, die benennt statt anpreist (z. B. nur der Teil vor dem Doppelpunkt).",
              severity: 1,
            }),
          );
        }
      }
    }
    return out;
  },
};

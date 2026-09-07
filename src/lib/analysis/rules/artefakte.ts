import { makeFinding, type RawFinding, type Rule } from "./rule";

interface Artefakt {
  re: RegExp;
  message: string;
  suggestion: string;
  severity: 1 | 2 | 3;
}

const ARTEFAKTE: Artefakt[] = [
  { re: /utm_source=chatgpt\.com/gi, message: "Chatbot-Zitierrest: Link mit „utm_source=chatgpt.com“ stammt aus einer ChatGPT-Antwort.", suggestion: "Parameter aus der URL entfernen und prüfen, ob der Link existiert.", severity: 3 },
  { re: /:?contentReference\[oaicite:\d+\]\{index=\d+\}|oaicite:\d+|:contentReference|turn\d+search\d+|turn\d+(?:news|image|view)\d+/g, message: "ChatGPT-Zitierrest (oaicite / contentReference / turn0search).", suggestion: "Rest entfernen und die Aussage mit einer echten Quelle belegen.", severity: 3 },
  { re: /\[cite:\s*\d+(?:,\s*\d+)*\]|\[span_\d+\](?:\(start_span\)|\(end_span\))?|grok_render_citation_card[^\s]*/g, message: "Chatbot-Zitierrest (Gemini/Grok).", suggestion: "Rest entfernen und die Aussage mit einer echten Quelle belegen.", severity: 3 },
  { re: /\*\*[^*\n]{1,120}\*\*/g, message: "Markdown-Rest: „**fett**“ wird in Word nicht dargestellt.", suggestion: "Sternchen entfernen; falls nötig, in Word fett formatieren.", severity: 3 },
  { re: /(?:^|\s)#{1,6}\s+\S/g, message: "Markdown-Rest: „#“-Überschrift.", suggestion: "Rautenzeichen entfernen und Überschriftenformat verwenden.", severity: 3 },
  { re: /`[^`\n]{1,80}`/g, message: "Markdown-Rest: Backticks.", suggestion: "Backticks entfernen.", severity: 2 },
  { re: /^\s*(?:[-*•▪◦]\s+)(?=\S)/g, message: "Kopiertes Aufzählungszeichen am Zeilenanfang statt Word-Listenformat.", suggestion: "Zeichen entfernen und Listenformatierung von Word verwenden.", severity: 2 },
  { re: /\[(?:Name|Datum|Firma|Ort|Titel|Betrag|Adresse|Link|Quelle|Zahl|Jahr|Produkt|Kunde|Firmenname|Ihr Name|dein Name)[^\]\n]{0,40}\]|\[(?:hier|bitte)[^\]\n]{0,60}(?:einfügen|ergänzen|eintragen)\]|\[[^\]\n]{0,40}(?:einfügen|ergänzen|eintragen)\]/gi, message: "Platzhaltertext aus einer Vorlage oder Chatbot-Antwort.", suggestion: "Platzhalter durch den echten Inhalt ersetzen.", severity: 3 },
  { re: /\b(?:Lorem ipsum)\b/gi, message: "Blindtext.", suggestion: "Entfernen.", severity: 3 },
];

const STRAIGHT_QUOTE = /"/g;
const TYPO_QUOTE = /[„“”»«]/g;

export const artefakteRule: Rule = {
  id: "artefakte",
  name: "Technische Artefakte",
  category: "artefakt",
  severity: 3,
  run: (ctx) => {
    const out: RawFinding[] = [];
    let straight = 0;
    let typo = 0;
    let firstStraight: { para: number; idx: number } | undefined;

    for (const para of ctx.textParagraphs) {
      for (const a of ARTEFAKTE) {
        a.re.lastIndex = 0;
        for (const m of para.text.matchAll(a.re)) {
          let start = m.index ?? 0;
          const end = start + m[0].length;
          // Führende Leerzeichen aus dem Match nehmen
          while (start < end && /\s/.test(para.text[start])) start++;
          if (end <= start) continue;
          out.push(makeFinding(para, start, end, a.message, { suggestion: a.suggestion, severity: a.severity }));
        }
      }
      const s = para.text.match(STRAIGHT_QUOTE)?.length ?? 0;
      const t = para.text.match(TYPO_QUOTE)?.length ?? 0;
      if (s > 0 && !firstStraight) firstStraight = { para: para.index, idx: para.text.indexOf('"') };
      straight += s;
      typo += t;
    }

    if (straight >= 2 && typo >= 2 && firstStraight) {
      const para = ctx.paragraphs[firstStraight.para];
      out.push(
        makeFinding(para, firstStraight.idx, firstStraight.idx + 1, "Gemischte Anführungszeichen im Dokument: gerade (\") und typografische („“) nebeneinander.", {
          suggestion: "Einheitlich deutsche Anführungszeichen „so“ verwenden.",
          severity: 2,
        }),
      );
    }

    // Abgebrochener letzter Satz
    const last = [...ctx.textParagraphs].reverse().find((p) => !p.isHeading && p.text.trim().length > 30);
    if (last) {
      const text = last.text.trimEnd();
      if (/[\p{L}\p{N},;:]$/u.test(text) && !/[.!?…"“”)\]]$/u.test(text)) {
        out.push(
          makeFinding(last, Math.max(0, text.length - 40), text.length, "Der Text endet ohne Satzschluss. Möglicherweise abgebrochene KI-Ausgabe.", {
            suggestion: "Satz vervollständigen oder Absatz streichen.",
            severity: 2,
          }),
        );
      }
    }

    return out;
  },
};

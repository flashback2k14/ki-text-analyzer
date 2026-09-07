import { compilePhrase, findPhrases, makeFinding, type PhrasePattern, type RawFinding, type Rule } from "./rule";

/* Gedankenstriche */

const DASH = /[–—]/g;
const RANGE_HYPHEN = /(?<=\d)-(?=\d)/g;

export const gedankenstricheRule: Rule = {
  id: "gedankenstriche",
  name: "Gedankenstrich-Häufung",
  category: "satzbau",
  severity: 3,
  run: (ctx) => {
    const out: RawFinding[] = [];
    for (const para of ctx.textParagraphs) {
      const matches = [...para.text.matchAll(DASH)].filter((m) => {
        // Bis-Striche in Spannen (2020–2024, 10–20 km) zählen nicht.
        const i = m.index ?? 0;
        const before = para.text[i - 1] ?? "";
        const after = para.text[i + 1] ?? "";
        return !(/\d/.test(before) && /\d/.test(after));
      });
      if (matches.length >= 2) {
        for (const m of matches) {
          const i = m.index ?? 0;
          // Umgebung markieren: Zeichen mit angrenzenden Leerzeichen.
          let start = i;
          let end = i + 1;
          while (start > 0 && para.text[start - 1] === " ") start--;
          while (end < para.text.length && para.text[end] === " ") end++;
          out.push(
            makeFinding(para, start, end, `Gedankenstrich-Häufung: ${matches.length} Gedankenstriche in einem Absatz. Das ist das bekannteste KI-Signal.`, {
              suggestion: "Durch Komma, Doppelpunkt, Klammer oder einen eigenen Satz ersetzen; höchstens einen Gedankenstrich pro Absatz belassen.",
              severity: matches.length >= 3 ? 3 : 2,
            }),
          );
        }
      }
      for (const m of para.text.matchAll(RANGE_HYPHEN)) {
        const i = m.index ?? 0;
        out.push(
          makeFinding(para, i, i + 1, "Bindestrich in einer Zahlenspanne. Typografisch korrekt ist der Bis-Strich (–).", {
            suggestion: "„–“ (Bis-Strich) verwenden, z. B. „2020–2024“.",
            severity: 1,
          }),
        );
      }
    }
    return out;
  },
};

/* Verbindungswörter am Absatzanfang */

const VERBINDUNG = /^(?:Darüber hinaus|Zusätzlich|Außerdem|Ferner|Des Weiteren|Zudem|Andererseits|Abschließend|Zusammenfassend|Insgesamt|Nicht zuletzt|Überdies|Weiterhin|Letztendlich|Letztlich|Schließlich|In diesem Zusammenhang|Vor diesem Hintergrund)\b/u;

export const verbindungswoerterRule: Rule = {
  id: "verbindungswoerter",
  name: "Verbindungswörter am Absatzanfang",
  category: "satzbau",
  severity: 2,
  run: (ctx) => {
    const hits: RawFinding[] = [];
    for (const para of ctx.textParagraphs) {
      if (para.isHeading) continue;
      const m = para.text.match(VERBINDUNG);
      if (m) {
        hits.push(
          makeFinding(para, 0, m[0].length, "", {
            suggestion: "Das Bindewort streichen und den Absatz direkt mit der Aussage beginnen.",
          }),
        );
      }
    }
    // Ein einzelnes Verbindungswort ist kein Verräter. Erst die Häufung zählt.
    const bodyParas = ctx.textParagraphs.filter((p) => !p.isHeading).length;
    const threshold = Math.max(3, Math.ceil(bodyParas * 0.3));
    if (hits.length < threshold) return [];
    return hits.map((h) => ({
      ...h,
      message: `Mechanische Absatzverknüpfung: ${hits.length} Absätze beginnen mit einem Verbindungswort.`,
      severity: hits.length >= threshold + 2 ? 3 : 2,
    }));
  },
};

/* Negativer Parallelismus */

const PARALLEL: PhrasePattern[] = [
  { pattern: "nicht nur [^.;!?]{1,80}?, sondern auch", message: "Formelhafter negativer Parallelismus („nicht nur …, sondern auch …“).", suggestion: "Beide Aussagen schlicht nebeneinanderstellen: „X. Y.“ oder „X und Y“." },
  { pattern: "es geht (?:hier |dabei |dabei nicht |nicht )?(?:nicht )?(?:nur )?(?:um|darum) [^.;!?]{1,60}?, sondern", message: "Negativer Parallelismus („es geht nicht um …, sondern …“).", suggestion: "Sagen, worum es geht, ohne die Verneinung." },
  { pattern: "(?:ist|sind|war|waren) (?:kein|keine|nicht bloß|nicht einfach|nicht nur) [^.;!?]{1,60}?, sondern (?:ein|eine|vielmehr)", message: "Negativer Parallelismus („ist kein …, sondern ein …“).", suggestion: "Direkt sagen, was es ist." },
];

const STATT = compilePhrase({ pattern: "statt", message: "" });

export const parallelismusRule: Rule = {
  id: "parallelismus",
  name: "Negativer Parallelismus",
  category: "satzbau",
  severity: 2,
  run: (ctx) => {
    const out = findPhrases(ctx, PARALLEL, { severity: 2 });
    // „X statt Y“ nur bei Häufung
    const statt: RawFinding[] = [];
    for (const para of ctx.textParagraphs) {
      STATT.lastIndex = 0;
      for (const m of para.text.matchAll(STATT)) {
        const start = m.index ?? 0;
        statt.push(
          makeFinding(para, start, start + m[0].length, "„X statt Y“ als Dauerfigur (mehrfach im Dokument).", {
            suggestion: "Nur die zutreffende Seite nennen.",
            severity: 1,
          }),
        );
      }
    }
    if (statt.length >= Math.max(4, Math.ceil(ctx.totalWords / 300))) out.push(...statt);
    return out;
  },
};

/* Kopula-Vermeidung und steife Synonyme */

const KOPULA: PhrasePattern[] = [
  { pattern: "dien(?:t|en|te|ten) als", message: "Kopula-Vermeidung: „dient als“ statt schlicht „ist“.", suggestion: "„ist“" },
  { pattern: "fungier(?:t|en|te|ten) als", message: "Kopula-Vermeidung: „fungiert als“ statt „ist“.", suggestion: "„ist“" },
  { pattern: "stell(?:t|en|te|ten) (?:ein|eine|einen|das|den|die) [^.;!?]{1,40}? dar", message: "Kopula-Vermeidung: „stellt … dar“ statt „ist“.", suggestion: "„ist“" },
  { pattern: "verf(?:ü|ue)g(?:t|en|te|ten) (?:über|ueber)", message: "Kopula-Vermeidung: „verfügt über“ statt „hat“.", suggestion: "„hat“" },
  { pattern: "markier(?:t|en|te|ten) (?:den|einen|das|ein|die|eine) (?:Beginn|Anfang|Wendepunkt|Höhepunkt|Ende|Übergang|Meilenstein)", message: "Kopula-Vermeidung: „markiert den Beginn“ statt „ist der Beginn“ oder „beginnt“.", suggestion: "„ist“ oder „beginnt“" },
  { pattern: "bezeichnet (?:man |wird )?(?:ein|eine|einen|die|der|das) ", message: "„bezeichnet“ in Definitionen statt „ist“.", suggestion: "„ist“", severity: 1 },
  { pattern: "(?:bietet|bieten|bot|boten) (?:ein|eine|einen|die|das|den) (?:Möglichkeit|Plattform|Rahmen|Gelegenheit|Vielzahl|Reihe)", message: "Kopula-Vermeidung: „bietet“ als Ausweichverb.", suggestion: "„hat“, „ist“ oder „es gibt“", severity: 1 },
];

const SYNONYME: PhrasePattern[] = [
  { pattern: "verfasste(?:n)?|verfasst", message: "Steifes Synonym: „verfasste“ statt „schrieb“.", suggestion: "„schrieb“" },
  { pattern: "verstarb(?:en)?|verstorben", message: "Steifes Synonym: „verstarb“ statt „starb“.", suggestion: "„starb“" },
  { pattern: "siedelte(?:n)? (?:über|nach|um)|übersiedelte(?:n)?", message: "Steifes Synonym: „siedelte über“ statt „zog um“.", suggestion: "„zog um“ / „zog nach“" },
  { pattern: "bediente(?:n)? sich", message: "Steifes Synonym: „bediente sich“ statt „nutzte“.", suggestion: "„nutzte“" },
  { pattern: "erachtete(?:n)?|erachtet", message: "Steifes Synonym: „erachtete“ statt „hielt für“.", suggestion: "„hielt für“" },
  { pattern: "leistete(?:n)? Unterstützung|Unterstützung leisten", message: "Steifes Synonym: „leistete Unterstützung“ statt „half“.", suggestion: "„half“" },
  { pattern: "(?:in|im) (?:Anspruch|Gebrauch) (?:nehmen|nahm|nahmen|genommen)", message: "Steife Umschreibung.", suggestion: "„nutzen“ / „nutzte“", severity: 1 },
  { pattern: "zur Anwendung (?:kommen|kommt|kam|kamen|gebracht)", message: "Steife Umschreibung.", suggestion: "„angewendet werden“ / „verwendet“", severity: 1 },
  { pattern: "Verwendung finden|Verwendung fand|findet Verwendung|fand Verwendung", message: "Steife Umschreibung.", suggestion: "„verwendet werden“ / „wurde verwendet“", severity: 1 },
];

export const kopulaRule: Rule = {
  id: "kopula-vermeidung",
  name: "Kopula-Vermeidung",
  category: "satzbau",
  severity: 1,
  run: (ctx) => findPhrases(ctx, KOPULA, { severity: 1 }),
};

export const synonymeRule: Rule = {
  id: "steife-synonyme",
  name: "Steife Synonyme",
  category: "satzbau",
  severity: 1,
  run: (ctx) => findPhrases(ctx, SYNONYME, { severity: 1 }),
};

/* Trikolon */

const ADJ = "[\\p{Ll}][\\p{L}-]{3,}";
const TRIKOLON = new RegExp(`(?<![\\p{L}\\p{N}])(${ADJ}), (${ADJ}) und (${ADJ})(?![\\p{L}\\p{N}])`, "gu");
const SOWOHL = compilePhrase({ pattern: "sowohl [^.;!?]{1,50}? als auch [^.;!?]{1,50}? und ", message: "" });

export const trikolonRule: Rule = {
  id: "trikolon",
  name: "Rhetorisches Dreierschema",
  category: "satzbau",
  severity: 1,
  run: (ctx) => {
    const out: RawFinding[] = [];
    for (const para of ctx.textParagraphs) {
      TRIKOLON.lastIndex = 0;
      for (const m of para.text.matchAll(TRIKOLON)) {
        const start = m.index ?? 0;
        out.push(
          makeFinding(para, start, start + m[0].length, "Rhetorisches Dreierschema (Trikolon): drei gereihte Begriffe zur Betonung.", {
            suggestion: "Auf das zutreffende Wort beschränken oder in einen konkreten Satz auflösen.",
            severity: 1,
          }),
        );
      }
      SOWOHL.lastIndex = 0;
      for (const m of para.text.matchAll(SOWOHL)) {
        const start = m.index ?? 0;
        out.push(
          makeFinding(para, start, start + m[0].length, "Dreierschema „sowohl … als auch … und“.", {
            suggestion: "Schlichte Aufzählung mit „und“.",
            severity: 1,
          }),
        );
      }
    }
    return out;
  },
};

/* Partizip-Deutungen */

const PARTIZIP: PhrasePattern[] = [
  { pattern: "wodurch [^.;!?]{1,60}? (?:unterstrichen|hervorgehoben|verdeutlicht|betont|bekräftigt|untermauert) (?:wird|wurde|werden)", message: "Angehängte Deutung mit „wodurch … unterstrichen wird“ schiebt eine leere Bewertung nach.", suggestion: "Nebensatz streichen oder als eigenen, konkreten Satz formulieren." },
  { pattern: "was [^.;!?]{1,60}? (?:unterstreicht|hervorhebt|verdeutlicht|betont|widerspiegelt|zeigt|bekräftigt|untermauert)", message: "Angehängte Deutung („, was … unterstreicht“).", suggestion: "Nebensatz streichen oder konkret sagen, was folgt." },
  { pattern: "gewährleistend|widerspiegelnd|unterstreichend|verdeutlichend|hervorhebend|betonend|sicherstellend", message: "Partizip-I-Konstruktion als angehängte Deutung.", suggestion: "Eigenen Satz bilden oder Deutung weglassen." },
];

export const partizipRule: Rule = {
  id: "partizip-deutung",
  name: "Angehängte Partizip-Deutung",
  category: "satzbau",
  severity: 2,
  run: (ctx) => findPhrases(ctx, PARTIZIP, { severity: 2 }),
};

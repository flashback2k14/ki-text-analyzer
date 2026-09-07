import { compilePhrase, findPhrases, type PhrasePattern, type RawFinding, type Rule } from "./rule";

const MODEWOERTER: PhrasePattern[] = [
  { pattern: "(?:ein)?(?:tauchen|taucht|tauchte|getaucht) (?:wir |sie |man )?(?:tiefer )?(?:in|ein)", message: "KI-Modewort „eintauchen“.", suggestion: "„betrachten“, „ansehen“ oder „beschäftigen mit“." },
  { pattern: "beleuchte(?:t|n|te|ten)", message: "KI-Modewort „beleuchten“.", suggestion: "„beschreiben“, „untersuchen“, „zeigen“." },
  { pattern: "nahtlos(?:e|en|er|es)?", message: "KI-Modewort „nahtlos“.", suggestion: "„ohne Unterbrechung“, „direkt“ oder streichen." },
  { pattern: "robust(?:e|en|er|es)?", message: "KI-Modewort „robust“ (außerhalb der Technik meist Füllwort).", suggestion: "„stabil“, „belastbar“ oder konkret sagen, was hält." },
  { pattern: "facettenreich(?:e|en|er|es)?|vielschichtig(?:e|en|er|es)?", message: "KI-Modewort.", suggestion: "Konkret nennen, welche Aspekte gemeint sind." },
  { pattern: "lebendig(?:e|en|er|es)? (?:Kultur|Szene|Gemeinschaft|Tradition|Stadt|Viertel|Diskussion)", message: "KI-Modewort „lebendig“ als Dauerlob.", suggestion: "Beschreiben, was dort passiert." },
  { pattern: "(?:die|der|in der|in die) (?:digitale|digitalen|politische|politischen|wirtschaftliche|wirtschaftlichen|mediale|medialen|kulturelle|kulturellen|technologische|technologischen|moderne|modernen) Landschaft", message: "„Landschaft“ als Metapher, typisch für KI-Texte.", suggestion: "„Bereich“, „Markt“, „Umfeld“ oder konkret." },
  { pattern: "(?:ganzheitlich|holistisch)(?:e|en|er|es)?", message: "KI-Modewort.", suggestion: "„insgesamt“ oder konkret beschreiben." },
  { pattern: "zukunftsweisend(?:e|en|er|es)?|wegweisend(?:e|en|er|es)?|bahnbrechend(?:e|en|er|es)?", message: "Bedeutungsschweres Modewort.", suggestion: "Streichen oder konkret sagen, was neu ist." },
  { pattern: "(?:ein|einen|eine) (?:Gamechanger|Game-Changer|Paradigmenwechsel|Quantensprung)", message: "Buzzword.", suggestion: "Konkret beschreiben, was sich ändert." },
  { pattern: "(?:im|in) (?:Zeitalter|Zeiten) (?:der|des|von)", message: "Leere Epochenformel.", suggestion: "Streichen oder Jahr nennen." },
  { pattern: "das volle Potenzial (?:ausschöpfen|entfalten|freisetzen|nutzen)|Potenzial (?:freisetzen|entfesseln)", message: "Buzzword-Wendung.", suggestion: "Konkret sagen, was erreicht werden soll." },
  { pattern: "(?:Synergien|Synergieeffekte) (?:nutzen|schaffen|heben)", message: "Buzzword.", suggestion: "Konkret sagen, was zusammen besser geht." },
  { pattern: "spannend(?:e|en|er|es)?", message: "„spannend“ als Füllwort.", suggestion: "Streichen oder sagen, warum es interessant ist.", severity: 1 },
  { pattern: "innovativ(?:e|en|er|es)?", message: "Wertendes Modewort.", suggestion: "Konkret sagen, was neu ist.", severity: 1 },
  { pattern: "(?:empirisch|kausal|korreliert|korrelieren|korrelierend)(?:e|en|er|es)?", message: "Pseudo-wissenschaftliche Aufblähung, wenn keine Daten dahinterstehen.", suggestion: "Nur verwenden, wenn Daten genannt werden; sonst „zusammenhängen“ oder „aus Erfahrung“.", severity: 1 },
];

/** „entscheidend“ und „zentral“ als Dauerbetonung nur bei Häufung melden. */
const DAUERBETONUNG = compilePhrase({
  pattern: "entscheidend(?:e|en|er|es)?|zentral(?:e|en|er|es)?|essenziell(?:e|en|er|es)?|unverzichtbar(?:e|en|er|es)?",
  message: "",
});

export const modewoerterRule: Rule = {
  id: "modewoerter",
  name: "KI-Modewörter",
  category: "modewort",
  severity: 1,
  run: (ctx) => {
    const out: RawFinding[] = findPhrases(ctx, MODEWOERTER, { severity: 1 });
    const hits: RawFinding[] = [];
    for (const para of ctx.textParagraphs) {
      DAUERBETONUNG.lastIndex = 0;
      for (const m of para.text.matchAll(DAUERBETONUNG)) {
        const start = m.index ?? 0;
        hits.push({
          paragraphIndex: para.index,
          start,
          end: start + m[0].length,
          matchedText: m[0],
          message: "„entscheidend/zentral/essenziell“ als Dauerbetonung (mehrfach im Dokument).",
          suggestion: "Nur an einer Stelle betonen, sonst streichen.",
          suggestionSource: "rule",
          severity: 1,
        });
      }
    }
    const threshold = Math.max(3, Math.ceil(ctx.totalWords / 400));
    if (hits.length >= threshold) out.push(...hits);
    return out;
  },
};

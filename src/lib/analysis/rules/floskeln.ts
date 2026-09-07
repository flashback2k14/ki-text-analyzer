import { findPhrases, type PhrasePattern, type Rule } from "./rule";

const BEDEUTUNG: PhrasePattern[] = [
  { pattern: "spielt(?:e|en)? eine (?:bedeutende|wichtige|zentrale|entscheidende|wesentliche|große|tragende) Rolle", message: "Bedeutung wird behauptet statt gezeigt. Nenne, was konkret geschieht oder gilt.", suggestion: "Konkret sagen, was das Thema bewirkt, statt seine Rolle zu bewerten (z. B. „X ändert Y“)." },
  { pattern: "unterstreicht(?:en)? (?:die|seine|ihre|deren) (?:Bedeutung|Wichtigkeit|Relevanz)", message: "Selbstbewertung des Textes. Die Bedeutung zeigt sich am Inhalt, nicht an der Ankündigung.", suggestion: "Satzteil streichen." },
  { pattern: "(?:steht|stehen|gilt|gelten) als (?:Zeugnis|Beleg|Beweis|Symbol|Sinnbild) (?:für|der|des)", message: "Feierliche Deutungsformel, typisch für KI-Texte.", suggestion: "„ist“ oder „zeigt“ verwenden, ohne Sinnbild-Formel." },
  { pattern: "als (?:Zeugnis|Sinnbild|Symbol|Beleg) (?:für|der|des|seiner|ihrer|einer|eines|unternehmerischer|menschlicher|kultureller|historischer|wirtschaftlicher)", message: "Feierliche Deutungsformel („als Zeugnis für …“).", suggestion: "„zeigt“ oder streichen." },
  { pattern: "gilt als (?:Wendepunkt|Meilenstein)", message: "Bedeutungsformel ohne Beleg, wer das so sieht.", suggestion: "Beschreiben, was sich danach konkret geändert hat, oder nennen, wer das so einordnet." },
  { pattern: "hinterl(?:ässt|ießen|ieß|assen) (?:einen|ein) (?:bleibenden|nachhaltigen|unauslöschlichen) (?:Eindruck|Erbe|Vermächtnis)", message: "Bedeutungsschwere Wendung ohne Inhalt.", suggestion: "Weglassen oder durch eine konkrete Folge ersetzen." },
  { pattern: "tief verwurzelt(?:e|en|er|es)?", message: "Aufgeblähte Bedeutung.", suggestion: "„verbreitet“, „üblich“ oder „seit langem“." },
  { pattern: "unersch(?:ü|ue)tterlich(?:e|en|er|es)?", message: "Pathos-Wort, in sachlichen Texten unüblich.", suggestion: "„beständig“ oder streichen." },
  { pattern: "von (?:entscheidender|zentraler|immenser|enormer|großer) (?:Bedeutung|Wichtigkeit|Tragweite)", message: "Bedeutung wird behauptet statt begründet.", suggestion: "„wichtig für …, weil …“ oder streichen." },
  { pattern: "(?:ein|einen) (?:bedeutenden|wichtigen|wertvollen|entscheidenden) Beitrag (?:leisten|leistet|leistete|geleistet)", message: "Floskel, die Bedeutung zuschreibt, ohne zu sagen, was getan wurde.", suggestion: "Konkret nennen, was beigetragen wurde." },
  { pattern: "prägt(?:e|en)? (?:bis heute|nachhaltig|maßgeblich)", message: "Bedeutungsformel.", suggestion: "Sagen, was sich konkret geändert hat." },
  { pattern: "bleibendes Verm(?:ä|ae)chtnis", message: "Bedeutungsschwere Wendung.", suggestion: "Weglassen oder konkret beschreiben, was geblieben ist." },
];

const WERBUNG: PhrasePattern[] = [
  { pattern: "reich(?:es|en|em|er)? (?:kulturelles|kulturellen|kulturellem|kulturelle|historisches|historischen) Erbe", message: "Prospektsprache.", suggestion: "Konkret nennen, welche Bauwerke, Bräuche oder Werke gemeint sind." },
  { pattern: "atemberaubend(?:e|en|er|es)?", message: "Werbesprache.", suggestion: "Streichen oder sachlich beschreiben (Höhe, Aussicht, Größe)." },
  { pattern: "beeindruckend(?:e|en|er|es)? (?:Schönheit|Vielfalt|Kulisse|Architektur)", message: "Werbesprache.", suggestion: "Sachlich beschreiben, worin die Besonderheit besteht." },
  { pattern: "im Herzen (?:von|der|des)", message: "Prospektformel.", suggestion: "„in der Mitte von“, „zentral in“ oder Ortsangabe." },
  { pattern: "(?:ein|das) (?:absolutes|echtes)? ?Muss(?: für)?", message: "Werbesprache.", suggestion: "Streichen." },
  { pattern: "unbedingt (?:sehenswert|empfehlenswert|besuchen)", message: "Werbesprache.", suggestion: "Streichen oder sachlich begründen." },
  { pattern: "(?:ein|eine) (?:wahres|wahre|echtes|echte) (?:Juwel|Perle|Paradies|Highlight|Kleinod)", message: "Werbesprache.", suggestion: "Streichen." },
  { pattern: "unvergesslich(?:e|en|er|es)?", message: "Werbesprache.", suggestion: "Streichen." },
  { pattern: "erstklassig(?:e|en|er|es)?|hochkarätig(?:e|en|er|es)?|weltklasse", message: "Werbesprache.", suggestion: "Konkrete Angabe (Auszeichnung, Zahl) oder streichen." },
  { pattern: "(?:bietet|bieten) (?:für )?jeden (?:Geschmack )?etwas", message: "Prospektformel.", suggestion: "Streichen." },
  { pattern: "pulsierend(?:e|en|er|es)? (?:Metropole|Stadt|Leben|Zentrum)", message: "Werbesprache.", suggestion: "Sachlich beschreiben." },
  { pattern: "malerisch(?:e|en|er|es)?|idyllisch(?:e|en|er|es)?|zauberhaft(?:e|en|er|es)?", message: "Werbesprache.", suggestion: "Streichen oder konkret beschreiben." },
];

const REDAKTIONELL: PhrasePattern[] = [
  { pattern: "es ist wichtig(?:,)? (?:zu beachten|zu betonen|zu erwähnen|anzumerken|hervorzuheben|zu verstehen)", message: "Der Text bewertet sich selbst. Wenn etwas wichtig ist, zeigt sich das am Inhalt.", suggestion: "Einleitung streichen und direkt mit der Aussage beginnen." },
  { pattern: "es ist (?:bemerkenswert|erwähnenswert|interessant|anzumerken|hervorzuheben|festzuhalten|zu beachten|zu betonen)(?:, dass)?", message: "Redaktioneller Kommentar.", suggestion: "Einleitung streichen." },
  { pattern: "(?:bemerkenswert|erwähnenswert|interessant|beachtenswert) ist(?:, dass| auch| dabei)?", message: "Redaktioneller Kommentar.", suggestion: "Einleitung streichen." },
  { pattern: "(?:keine|jede) (?:Betrachtung|Diskussion|Darstellung|Analyse) (?:wäre|ist) (?:vollständig|komplett) ohne", message: "Formel, mit der der Text sich selbst inszeniert.", suggestion: "Streichen." },
  { pattern: "(?:an dieser Stelle|hierbei|dabei) (?:sei|ist) (?:darauf hingewiesen|anzumerken|zu erwähnen|hervorzuheben)", message: "Redaktioneller Kommentar.", suggestion: "Streichen, Aussage direkt formulieren." },
  { pattern: "wie bereits erwähnt|wie oben (?:erwähnt|beschrieben|dargestellt)", message: "Meta-Kommentar. In kurzen Texten oft überflüssig.", suggestion: "Streichen." },
  { pattern: "(?:in|im) (?:der|diesem) (?:heutigen|modernen|digitalen) (?:Zeit|Welt|Zeitalter)", message: "Leere Zeitformel, typisch für generierte Einleitungen.", suggestion: "Streichen oder konkretes Jahr bzw. konkreten Anlass nennen." },
];

const AUTORITAET: PhrasePattern[] = [
  { pattern: "Studien (?:zeigen|belegen|haben gezeigt)", message: "Vage Autorität. Welche Studie, von wem, wann?", suggestion: "Konkrete Studie mit Autor und Jahr nennen oder Aussage streichen." },
  { pattern: "(?:Experten|Expertinnen|Fachleute|Wissenschaftler|Forscher) (?:sind sich einig|betonen|warnen|empfehlen|sagen|gehen davon aus)", message: "Vage Autorität.", suggestion: "Konkret nennen, wer das sagt." },
  { pattern: "(?:Beobachter|Kritiker|Analysten|Kenner|Branchenkenner|Insider) (?:meinen|argumentieren|sehen|sagen|betonen|warnen)", message: "Weasel-Wording.", suggestion: "Person oder Institution nennen." },
  { pattern: "(?:Branchenberichte|Berichte|Umfragen|Untersuchungen|Erhebungen) zeigen", message: "Vage Autorität.", suggestion: "Quelle nennen." },
  { pattern: "es wird (?:oft|häufig|allgemein|vielfach) (?:gesagt|angenommen|behauptet|davon ausgegangen)", message: "Weasel-Wording.", suggestion: "Nennen, wer das sagt, oder streichen." },
  { pattern: "(?:allgemein|weithin|weitgehend) (?:anerkannt|bekannt|akzeptiert)", message: "Behauptete Einigkeit ohne Beleg.", suggestion: "Beleg nennen oder streichen." },
  { pattern: "(?:fand|findet|fanden|finden) (?:große |breite |viel )?(?:Beachtung|Anerkennung|Aufmerksamkeit) (?:in|bei) (?:der Fachpresse|den Medien|der Presse|Fachkreisen|der Öffentlichkeit)", message: "Bekanntheit wird über Medienpräsenz behauptet statt über Inhalt.", suggestion: "Konkret schreiben, was passiert ist; Quellen als Beleg, nicht als Argument." },
  { pattern: "in (?:überregionalen|nationalen|internationalen|regionalen|zahlreichen) Medien (?:besprochen|erwähnt|behandelt|Beachtung)", message: "Medienpräsenz als Argument.", suggestion: "Inhalt statt Berichterstattung beschreiben." },
  { pattern: "(?:wurde|wird) in der Fachpresse (?:besprochen|diskutiert|erwähnt|gewürdigt)", message: "Medienpräsenz als Argument.", suggestion: "Inhalt statt Berichterstattung beschreiben." },
  { pattern: "(?:unterhält|pflegt) eine aktive Präsenz (?:in|auf) (?:sozialen Medien|Social Media)", message: "Bekanntheit wird behauptet.", suggestion: "Streichen." },
];

export const floskelnRule: Rule = {
  id: "floskeln-bedeutung",
  name: "Aufgeblähte Bedeutung",
  category: "bedeutung",
  severity: 2,
  run: (ctx) => findPhrases(ctx, BEDEUTUNG, { severity: 2 }),
};

export const werbungRule: Rule = {
  id: "werbesprache",
  name: "Werbesprache",
  category: "werbung",
  severity: 2,
  run: (ctx) => findPhrases(ctx, WERBUNG, { severity: 2 }),
};

export const redaktionellRule: Rule = {
  id: "redaktioneller-kommentar",
  name: "Redaktioneller Kommentar",
  category: "redaktionell",
  severity: 2,
  run: (ctx) => findPhrases(ctx, REDAKTIONELL, { severity: 2 }),
};

export const autoritaetRule: Rule = {
  id: "vage-autoritaet",
  name: "Vage Autorität",
  category: "autoritaet",
  severity: 2,
  run: (ctx) => findPhrases(ctx, AUTORITAET, { severity: 2 }),
};

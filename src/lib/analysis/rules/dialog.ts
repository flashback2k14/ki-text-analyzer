import { findPhrases, type PhrasePattern, type Rule } from "./rule";

const DIALOG: PhrasePattern[] = [
  { pattern: "ich hoffe, (?:das|dies|diese Informationen|diese Übersicht|dieser Text|diese Zusammenfassung) (?:hilft|helfen|weiterhilft|weiterhelfen|ist hilfreich|sind hilfreich)", message: "Chat-Rest: Abschiedsformel eines Chatbots.", suggestion: "Satz streichen.", severity: 3 },
  { pattern: "(?:gerne|natürlich|selbstverständlich|klar|sehr gerne)! ?(?:hier|das|im folgenden)?", message: "Chat-Rest: Zusage eines Chatbots am Textanfang.", suggestion: "Streichen.", severity: 3 },
  { pattern: "(?:gute|tolle|interessante|spannende) Frage[!.]?", message: "Chat-Rest.", suggestion: "Streichen.", severity: 3 },
  { pattern: "hier (?:ist|sind|findest du|finden Sie) (?:der|die|das|ein|eine|einen) (?:gewünschte|überarbeitete|angepasste|fertige|vollständige|kurze)?\\s?(?:Artikel|Text|Übersicht|Zusammenfassung|Version|Entwurf|Fassung|Liste|Tabelle|Antwort)", message: "Chat-Rest: Einleitung einer Chatbot-Antwort.", suggestion: "Satz streichen.", severity: 3 },
  { pattern: "(?:möchtest du|möchten Sie|soll ich|wenn du möchtest|wenn Sie möchten|bei Bedarf kann ich)(?:, dass ich)?", message: "Chat-Rest: Nachfrage eines Chatbots.", suggestion: "Satz streichen.", severity: 3 },
  { pattern: "(?:lass|lassen Sie) (?:es )?mich wissen|(?:melde dich|melden Sie sich) (?:gerne|einfach)", message: "Chat-Rest.", suggestion: "Streichen.", severity: 3 },
  { pattern: "ich hoffe, (?:diese Nachricht|diese E-Mail|diese Mail) (?:erreicht|findet) (?:Sie|dich|euch) (?:wohlbehalten|gut|bei bester Gesundheit)", message: "Briefformel, die in Fließtexten und Beiträgen nichts verloren hat.", suggestion: "Streichen.", severity: 3 },
  { pattern: "(?:stand|bis zu|nach) (?:meines|meinem|meiner) (?:letzten )?(?:updates?|wissensstand(?:s|es)?|kenntnisstand(?:s|es)?|trainings(?:daten|stand)?)", message: "Hinweis auf den Wissensstand eines Sprachmodells.", suggestion: "Streichen; Unsicherheit sachlich zur Sache formulieren.", severity: 3 },
  { pattern: "als (?:KI|Sprachmodell|künstliche Intelligenz|KI-Modell)(?: kann ich| habe ich| bin ich)?", message: "Selbstbezug eines Sprachmodells.", suggestion: "Streichen.", severity: 3 },
  { pattern: "(?:dieser Text|dieser Artikel|dieser Entwurf|der Text|die Struktur|dieser Beitrag) (?:wahrt|folgt|hält sich an|berücksichtigt|erfüllt|entspricht) (?:einen|einem|den|die|der) (?:neutralen|sachlichen|gewünschten|vorgegebenen) (?:Ton|Stil|Richtlinien|Vorgaben|Anforderungen)", message: "Selbstbeschreibung des eigenen Entwurfs, ein übernommener Chatbot-Kommentar.", suggestion: "Satz streichen.", severity: 3 },
  { pattern: "soweit (?:in den|aus den) (?:verfügbaren|vorliegenden) Quellen ersichtlich", message: "Chatbot-Absicherung statt sachlicher Unsicherheitsangabe.", suggestion: "„Ob …, ist nicht belegt“ oder streichen.", severity: 2 },
  { pattern: "(?:falls|wenn) du (?:weitere|noch) (?:Fragen|Wünsche|Anpassungen) hast|(?:falls|wenn) Sie (?:weitere|noch) (?:Fragen|Wünsche|Anpassungen) haben", message: "Chat-Rest.", suggestion: "Streichen.", severity: 3 },
];

export const dialogRule: Rule = {
  id: "dialog-reste",
  name: "Dialog- und Meta-Reste",
  category: "dialog",
  severity: 3,
  run: (ctx) => findPhrases(ctx, DIALOG, { severity: 3 }),
};

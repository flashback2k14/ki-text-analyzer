import type { Category, Finding, Paragraph, Score, ScoreLabel, Stats } from "./types";
import { CATEGORY_LABELS } from "./types";

const CATEGORY_WEIGHT: Record<Category, number> = {
  bedeutung: 1.0,
  werbung: 0.9,
  redaktionell: 1.0,
  autoritaet: 1.0,
  modewort: 0.5,
  satzbau: 0.8,
  struktur: 1.4,
  formatierung: 1.0,
  artefakt: 1.6,
  dialog: 1.8,
};

export function computeScore(findings: Finding[], stats: Stats, paragraphs: Paragraph[]): Score {
  // Mindestbasis, damit wenige Funde in sehr kurzen Texten nicht zu einem hohen Wert führen.
  const words = Math.max(stats.words, 250);
  const per1000 = 1000 / words;
  const reasons: string[] = [];

  // Grundwert: gewichtete Funde je 1000 Wörter, mit abnehmendem Grenznutzen.
  let weighted = 0;
  const byCategory = new Map<Category, number>();
  for (const f of findings) {
    const w = f.severity * CATEGORY_WEIGHT[f.category];
    weighted += w;
    byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1);
  }
  const density = weighted * per1000; // z. B. 20 gewichtete Punkte auf 500 Wörter → 40
  let value = 100 * (1 - Math.exp(-density / 45));

  // Dokumentmuster geben Zuschläge, weil sie unabhängig von der Textlänge starke Signale sind.
  const has = (ruleId: string) => findings.some((f) => f.ruleId === ruleId);
  const bonuses: { cond: boolean; points: number; reason: string }[] = [
    { cond: findings.some((f) => f.category === "dialog"), points: 20, reason: "Dialog- oder Meta-Reste eines Chatbots im Text" },
    { cond: findings.some((f) => f.category === "artefakt" && f.severity === 3), points: 15, reason: "Chatbot-Zitierreste, Markdown-Reste oder Platzhalter" },
    { cond: findings.some((f) => f.ruleId === "struktur" && f.severity === 3), points: 12, reason: "Fazit- oder „Herausforderungen und Ausblick“-Baustein" },
    { cond: has("verbindungswoerter"), points: 8, reason: "Mechanische Absatzanfänge mit Verbindungswörtern" },
    { cond: stats.dashesPer1000Words >= 6 && stats.words >= 150, points: 10, reason: `Hohe Gedankenstrich-Dichte (${stats.dashesPer1000Words.toFixed(1)} je 1000 Wörter)` },
    { cond: findings.some((f) => f.ruleId === "formatierung" && f.severity >= 2), points: 6, reason: "Inline-Header-Listen oder Emojis" },
  ];
  for (const b of bonuses) {
    if (b.cond) {
      value += b.points;
      reasons.push(b.reason);
    }
  }

  // Sehr kurze Texte liefern wenig Evidenz.
  if (stats.words < 80 && findings.length < 3) {
    value *= 0.6;
    reasons.push("Sehr kurzer Text, geringe Aussagekraft");
  }

  value = Math.max(0, Math.min(100, Math.round(value)));

  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topCategories.length) {
    reasons.unshift(
      `${findings.length} Fundstellen auf ${stats.words} Wörter, vor allem: ${topCategories.map(([c, n]) => `${CATEGORY_LABELS[c]} (${n})`).join(", ")}`,
    );
  } else {
    reasons.unshift("Keine der bekannten KI-Muster gefunden");
  }
  if (paragraphs.length === 0) reasons.push("Dokument enthält keinen Text");

  let label: ScoreLabel = "unauffällig";
  if (value >= 65) label = "stark verdächtig";
  else if (value >= 30) label = "auffällig";

  return { value, label, reasons };
}

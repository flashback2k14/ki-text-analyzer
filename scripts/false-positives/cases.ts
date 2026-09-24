/**
 * Testmaterial für den Vergleich: Welche Fundstellen der Regeln sind echte Auffälligkeiten,
 * welche Fehlalarme?
 *
 * Die Fixtures unter tests/fixtures sind so gebaut, dass jede Fundstelle ein echtes Merkmal ist.
 * Fehlalarme kommen dort nicht vor. Die Fälle hier ergänzen deshalb menschlich geschriebene
 * Absätze, in denen eine Regel anschlägt, obwohl der Ausdruck wörtlich, fachsprachlich oder
 * belegt verwendet wird. Drei Fälle sind echte Treffer als Gegenprobe.
 *
 * Jede Fundstelle eines Falls braucht ein Soll-Urteil unter ihrem markierten Text. Der Test in
 * tests/false-positives.test.ts prüft das, damit geänderte Regeln hier auffallen.
 */

export type Urteil = "auffaellig" | "fehlalarm";

export interface Case {
  id: string;
  absaetze: { text: string; heading?: boolean }[];
  /** Soll-Urteil je markiertem Text (exakt wie von der Regel gefunden). */
  urteile: Record<string, Urteil>;
}

export const CASES: Case[] = [
  {
    id: "stahlrohre",
    absaetze: [{ text: "Das Werk in Mülheim fertigt nahtlose Stahlrohre bis 660 mm Außendurchmesser, geschweißte Rohre kommen aus Hamm." }],
    urteile: { nahtlose: "fehlalarm" },
  },
  {
    id: "regression",
    absaetze: [{ text: "Für die Auswertung haben wir eine robuste Regression nach Huber verwendet, weil drei Messpunkte als Ausreißer auffielen." }],
    urteile: { robuste: "fehlalarm" },
  },
  {
    id: "motor",
    absaetze: [{ text: "Der Motor ist robust und läuft auch bei minus 20 Grad." }],
    urteile: { robust: "fehlalarm" },
  },
  {
    id: "tempo-30",
    absaetze: [{ text: "Studien zeigen, dass Tempo 30 die Zahl schwerer Unfälle senkt (Umweltbundesamt 2016, S. 41)." }],
    urteile: { "Studien zeigen": "fehlalarm" },
  },
  {
    id: "reformation",
    absaetze: [{ text: "Luther verfasste 1520 die drei großen Reformationsschriften." }],
    urteile: { verfasste: "fehlalarm" },
  },
  {
    id: "messwerte",
    absaetze: [{ text: "Die Messwerte korrelieren mit r = 0,82 (n = 140) mit der Außentemperatur." }],
    urteile: { korrelieren: "fehlalarm" },
  },
  {
    id: "herzklappe",
    absaetze: [{ text: "Die Klappe im Herzen des Patienten wurde 2019 ersetzt." }],
    urteile: { "im Herzen des": "fehlalarm" },
  },
  {
    id: "kapelle",
    absaetze: [{ text: "Die malerische Ausgestaltung der Kapelle stammt von Johann Baptist Zimmermann." }],
    urteile: { malerische: "fehlalarm" },
  },
  {
    id: "parkplatz",
    absaetze: [{ text: "Der Parkplatz wird nachts bis 23 Uhr beleuchtet." }],
    urteile: { beleuchtet: "fehlalarm" },
  },
  {
    id: "wrack",
    absaetze: [{ text: "Die Taucher tauchen in 30 Metern Tiefe in den Rumpf des Wracks ein." }],
    urteile: { "tauchen in": "fehlalarm" },
  },
  {
    id: "pruefbericht",
    absaetze: [
      { text: "Fazit", heading: true },
      { text: "Die Pumpe lief 1.200 Stunden ohne Ausfall. Wir setzen sie ab März in allen drei Hallen ein." },
    ],
    urteile: { Fazit: "fehlalarm" },
  },
  {
    id: "scheune",
    absaetze: [{ text: "Die alte Scheune dient als Lager für Streugut." }],
    urteile: { "dient als": "fehlalarm" },
  },
  {
    id: "bedienungsanleitung",
    absaetze: [{ text: "Es ist wichtig zu beachten, dass das Gerät vor dem Öffnen vom Netz getrennt wird." }],
    urteile: { "Es ist wichtig zu beachten": "auffaellig" },
  },
  {
    id: "rathaus",
    absaetze: [{ text: "Das neue Rathaus steht im Herzen der Altstadt und ist ein wahres Juwel." }],
    urteile: { "im Herzen der": "auffaellig", "ein wahres Juwel": "auffaellig" },
  },
];

/** Fixtures, deren Fundstellen alle als echte Auffälligkeit gelten. */
export const FIXTURES = ["ki-typisch", "menschlich", "tabellen-listen"] as const;

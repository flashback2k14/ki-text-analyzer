import { describe, expect, it } from "vitest";
import { analyzeText } from "@/lib/analysis/analyze";
import type { Paragraph } from "@/lib/analysis/types";
import { analyzeParagraphs } from "@/lib/analysis/analyze";

const ruleIds = (text: string) => analyzeText(text).findings.map((f) => f.ruleId);
const matched = (text: string, ruleId: string) =>
  analyzeText(text)
    .findings.filter((f) => f.ruleId === ruleId)
    .map((f) => f.matchedText);

describe("Gedankenstriche", () => {
  it("meldet zwei oder mehr Gedankenstriche in einem Absatz", () => {
    expect(ruleIds("Das Projekt – ein Versuch – ist gut gelaufen.")).toContain("gedankenstriche");
  });
  it("lässt einen einzelnen Gedankenstrich durch", () => {
    expect(ruleIds("Das Projekt – ein Versuch – ist gut gelaufen.".replace(" – ein Versuch –", " – ein Versuch,"))).not.toContain("gedankenstriche");
  });
  it("ignoriert Bis-Striche in Zahlenspannen", () => {
    expect(ruleIds("Von 2020–2024 wurden 10–20 Geräte geliefert.")).not.toContain("gedankenstriche");
  });
  it("meldet Bindestriche in Zahlenspannen als Hinweis", () => {
    const f = analyzeText("Im Zeitraum 2020-2024 stieg die Zahl.").findings.find((x) => x.ruleId === "gedankenstriche");
    expect(f?.severity).toBe(1);
  });
});

describe("Floskeln und Werbesprache", () => {
  it("findet aufgeblähte Bedeutung mit Ersatzvorschlag", () => {
    const f = analyzeText("Der Verein spielt eine bedeutende Rolle im Ort.").findings.find((x) => x.ruleId === "floskeln-bedeutung");
    expect(f?.matchedText).toBe("spielt eine bedeutende Rolle");
    expect(f?.suggestion).toBeTruthy();
    expect(f?.suggestionSource).toBe("rule");
  });
  it("findet Werbesprache und Umlaute korrekt an Wortgrenzen", () => {
    expect(matched("Die Stadt liegt im Herzen der Region und bietet eine atemberaubende Kulisse.", "werbesprache")).toEqual(["im Herzen der", "atemberaubende"]);
  });
  it("findet redaktionelle Kommentare", () => {
    expect(matched("Es ist wichtig zu beachten, dass der Kurs gilt.", "redaktioneller-kommentar")).toEqual(["Es ist wichtig zu beachten"]);
  });
  it("findet vage Autoritäten und Medienpräsenz", () => {
    const ids = ruleIds("Studien zeigen, dass es klappt. Das Projekt fand Beachtung in der Fachpresse.");
    expect(ids.filter((id) => id === "vage-autoritaet")).toHaveLength(2);
  });
  it("meldet einen nüchternen Satz nicht", () => {
    expect(ruleIds("Die Werkbank haben wir um zehn Zentimeter erhöht. Das klingt wenig, aber man merkt es beim Löten sofort.")).toEqual([]);
  });
});

describe("Modewörter", () => {
  it("findet nahtlos, robust und die Landschafts-Metapher", () => {
    expect(matched("Die robuste Lösung fügt sich nahtlos in die digitale Landschaft ein.", "modewoerter")).toEqual(["robuste", "nahtlos", "in die digitale Landschaft"]);
  });
  it("meldet „entscheidend“ erst bei Häufung", () => {
    expect(matched("Das ist entscheidend.", "modewoerter")).toEqual([]);
    const text = "Das ist entscheidend. Der Punkt ist zentral. Die Frage ist essenziell. Alles ist entscheidend.";
    expect(matched(text, "modewoerter").length).toBeGreaterThanOrEqual(3);
  });
});

describe("Verbindungswörter", () => {
  const p = (s: string) => s;
  it("ignoriert ein einzelnes Verbindungswort", () => {
    const text = [p("Darüber hinaus gibt es Kaffee."), p("Der Raum ist groß."), p("Wir treffen uns um zehn."), p("Danach gehen wir essen.")].join("\n\n");
    expect(ruleIds(text)).not.toContain("verbindungswoerter");
  });
  it("meldet die Häufung", () => {
    const text = [p("Darüber hinaus gibt es Kaffee."), p("Zusätzlich gibt es Tee."), p("Außerdem gibt es Wasser."), p("Ferner gibt es Saft.")].join("\n\n");
    expect(ruleIds(text).filter((id) => id === "verbindungswoerter")).toHaveLength(4);
  });
});

describe("Satzbau", () => {
  it("findet negativen Parallelismus", () => {
    expect(matched("Es ist nicht nur ein Werkzeug, sondern auch ein Freund.", "parallelismus")).toEqual(["nicht nur ein Werkzeug, sondern auch"]);
  });
  it("findet Kopula-Vermeidung mit Ersatz „ist“", () => {
    const f = analyzeText("Das Gebäude fungiert als Ausstellungshaus.").findings.find((x) => x.ruleId === "kopula-vermeidung");
    expect(f?.matchedText).toBe("fungiert als");
    expect(f?.suggestion).toBe("„ist“");
  });
  it("findet steife Synonyme", () => {
    expect(matched("Er verfasste ein Buch und verstarb 1990.", "steife-synonyme")).toEqual(["verfasste", "verstarb"]);
  });
  it("findet das Trikolon, nicht aber eine sachliche Aufzählung mit Substantiven", () => {
    expect(matched("Das Gerät ist schnell, zuverlässig und elegant.", "trikolon")).toEqual(["schnell, zuverlässig und elegant"]);
    expect(matched("Wir kauften Holz, Lampen und Schrauben.", "trikolon")).toEqual([]);
  });
  it("findet angehängte Partizip-Deutungen auch nach Komma", () => {
    expect(matched("Sie wurde geehrt, wodurch ihre Bedeutung unterstrichen wird.", "partizip-deutung")).toEqual(["wodurch ihre Bedeutung unterstrichen wird"]);
  });
});

describe("Struktur", () => {
  const heading = (text: string, index: number): Paragraph => ({ index, text, isHeading: true, isListItem: false, runs: [{ text, bold: false }] });
  const body = (text: string, index: number): Paragraph => ({ index, text, isHeading: false, isListItem: false, runs: [{ text, bold: false }] });

  it("meldet Fazit-Überschrift und Fazit-Formel", () => {
    const r = analyzeParagraphs([body("Der Text beginnt hier.", 0), heading("Fazit", 1), body("Zusammenfassend lässt sich sagen, dass alles gut ist.", 2)]);
    const ids = r.findings.map((f) => f.ruleId);
    expect(ids.filter((id) => id === "struktur")).toHaveLength(2);
  });
  it("meldet englische Titel-Großschreibung nur in Überschriften", () => {
    const heads = analyzeParagraphs([heading("Die Wichtigsten Vorteile Im Überblick", 0)]).findings;
    expect(heads[0]?.ruleId).toBe("struktur");
    expect(heads[0]?.suggestion).toContain("Die wichtigsten Vorteile im Überblick");
    expect(analyzeParagraphs([body("Die Wichtigsten Vorteile Im Überblick.", 0)]).findings.filter((f) => f.ruleId === "struktur")).toHaveLength(0);
  });
  it("meldet den Herausforderungen-Baustein", () => {
    expect(ruleIds("Trotz seiner Erfolge steht der Verein vor mehreren Herausforderungen.")).toContain("struktur");
  });
});

describe("Formatierung", () => {
  const item = (label: string, rest: string, index: number): Paragraph => ({
    index,
    text: `${label}: ${rest}`,
    isHeading: false,
    isListItem: true,
    runs: [
      { text: `${label}:`, bold: true },
      { text: ` ${rest}`, bold: false },
    ],
  });
  it("meldet Inline-Header-Listen ab zwei Einträgen", () => {
    const one = analyzeParagraphs([item("Flexibilität", "Das System passt sich an.", 0)]);
    expect(one.findings.map((f) => f.ruleId)).not.toContain("formatierung");
    const two = analyzeParagraphs([item("Flexibilität", "Das System passt sich an.", 0), item("Sicherheit", "Daten sind geschützt.", 1)]);
    expect(two.findings.filter((f) => f.ruleId === "formatierung")).toHaveLength(2);
    expect(two.findings[0].matchedText).toBe("Flexibilität:");
  });
  it("meldet Emojis am Absatzanfang", () => {
    expect(ruleIds("🚀 Los geht es mit dem Projekt.")).toContain("formatierung");
  });
});

describe("Artefakte", () => {
  it("findet Chatbot-Zitierreste und Markdown", () => {
    const text = "Siehe https://x.de/a?utm_source=chatgpt.com und **wichtig** sowie :contentReference[oaicite:2]{index=2}.";
    expect(matched(text, "artefakte")).toEqual(["utm_source=chatgpt.com", "**wichtig**", ":contentReference[oaicite:2]{index=2}"]);
  });
  it("findet Platzhalter", () => {
    expect(matched("Sehr geehrte [Name einfügen], willkommen.", "artefakte")).toEqual(["[Name einfügen]"]);
  });
  it("meldet gemischte Anführungszeichen erst bei mehreren Vorkommen beider Arten", () => {
    expect(ruleIds('Er sagte "ja" und sie sagte "nein".')).not.toContain("artefakte");
    expect(ruleIds('Er sagte „ja“ und sie sagte „nein“.')).not.toContain("artefakte");
    expect(ruleIds('Er sagte "ja", sie "nein". Er sagte „ja“, sie „nein“.')).toContain("artefakte");
  });
  it("meldet einen abgebrochenen Schluss", () => {
    expect(ruleIds("Der Bericht beschreibt die Lage im Detail und kommt dabei zu dem Schluss, dass")).toContain("artefakte");
  });
});

describe("Dialogreste", () => {
  it("findet Chatbot-Formeln", () => {
    const text = "Hier ist der Artikel. Ich hoffe, das hilft. Stand meines letzten Updates gibt es nichts Neues.";
    expect(matched(text, "dialog-reste")).toEqual(["Hier ist der Artikel", "Ich hoffe, das hilft", "Stand meines letzten Updates"]);
    expect(matched("Gerne! Der Text folgt.", "dialog-reste")).toEqual(["Gerne!"]);
  });
});

describe("Dedupe und IDs", () => {
  it("vergibt eindeutige, aufsteigende IDs und keine Überlappungen gleicher Kategorie", () => {
    const r = analyzeText("Zusammenfassend lässt sich sagen, dass es klappt.\n\nAußerdem ist es so.\n\nZudem auch.\n\nFerner ebenfalls.");
    const ids = r.findings.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < r.findings.length; i++) {
      const a = r.findings[i - 1];
      const b = r.findings[i];
      if (a.paragraphIndex === b.paragraphIndex && a.category === b.category) expect(b.start).toBeGreaterThanOrEqual(a.end);
    }
  });
});

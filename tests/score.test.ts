import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeParagraphs, analyzeText } from "@/lib/analysis/analyze";
import { parseDocx } from "@/lib/docx/parse";

const fixture = (name: string) => fs.readFileSync(path.resolve("tests/fixtures", name));

describe("Score", () => {
  it("stuft das KI-typische Dokument als stark verdächtig ein", async () => {
    const r = analyzeParagraphs(await parseDocx(fixture("ki-typisch.docx")));
    expect(r.score.label).toBe("stark verdächtig");
    expect(r.score.value).toBeGreaterThanOrEqual(65);
    expect(r.score.reasons.some((x) => x.includes("Dialog"))).toBe(true);
    expect(r.stats.findingsPerCategory.dialog).toBe(1);
  });

  it("stuft den nüchternen Text als unauffällig ein", async () => {
    const r = analyzeParagraphs(await parseDocx(fixture("menschlich.docx")));
    expect(r.score.label).toBe("unauffällig");
    expect(r.findings).toHaveLength(0);
    expect(r.stats.words).toBeGreaterThan(100);
  });

  it("lässt wenige Funde in einem kurzen Text nicht zu einem Höchstwert werden", async () => {
    const r = analyzeParagraphs(await parseDocx(fixture("tabellen-listen.docx")));
    expect(r.score.value).toBeLessThan(65);
  });

  it("berechnet Statistik", () => {
    const r = analyzeText("Ein Satz. Noch ein Satz! Und – nun – ein dritter?");
    expect(r.stats.sentences).toBe(3);
    expect(r.stats.words).toBe(9);
    expect(r.stats.dashesPer1000Words).toBe(222.2);
    expect(r.stats.paragraphs).toBe(1);
  });

  it("liefert 0 für leeren Text", () => {
    const r = analyzeText("");
    expect(r.score.value).toBe(0);
    expect(r.score.label).toBe("unauffällig");
  });
});

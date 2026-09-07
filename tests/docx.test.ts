import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { analyzeParagraphs } from "@/lib/analysis/analyze";
import { addCommentsToDocx } from "@/lib/docx/comments";
import { DocxError, parseDocx } from "@/lib/docx/parse";

const fixture = (name: string) => fs.readFileSync(path.resolve("tests/fixtures", name));

describe("parseDocx", () => {
  it("liefert Absätze mit Überschriften, Listen, Tabellen und Fett-Runs", async () => {
    const paras = await parseDocx(fixture("tabellen-listen.docx"));
    expect(paras.map((p) => p.text)).toEqual([
      "Bericht mit Tabelle",
      "Dieser Absatz hat geteilte Runs und spielt eine bedeutende Rolle im Test.",
      "Erster Punkt der Liste.",
      "Zweiter Punkt – mit einem Gedankenstrich – und noch einem.",
      "Zelle A",
      "Es ist bemerkenswert, dass Zelle B Text enthält.",
      "Letzter Absatz nach der Tabelle.",
    ]);
    expect(paras[0].isHeading).toBe(true);
    expect(paras[2].isListItem).toBe(true);
    expect(paras[1].runs.map((r) => r.bold)).toEqual([false, true, false]);
  });

  it("lehnt Nicht-ZIP-Dateien und ZIPs ohne document.xml ab", async () => {
    await expect(parseDocx(Buffer.from("kein zip"))).rejects.toBeInstanceOf(DocxError);
    const zip = new JSZip();
    zip.file("hallo.txt", "x");
    await expect(parseDocx(await zip.generateAsync({ type: "uint8array" }))).rejects.toThrow(/document\.xml/);
  });
});

describe("addCommentsToDocx", () => {
  it("verankert Kommentare run-genau, ohne den Text zu verändern", async () => {
    const src = fixture("tabellen-listen.docx");
    const before = await parseDocx(src);
    const out = await addCommentsToDocx(src, [
      { paragraphIndex: 1, start: 18, end: 26, text: "Erster Kommentar\nZweite Zeile" },
      { paragraphIndex: 1, start: 41, end: 69, text: "Floskel & <Sonderzeichen>" },
      { paragraphIndex: 5, start: 0, end: 26, text: "In der Tabelle" },
      { paragraphIndex: 0, start: 0, end: 0, text: "Dokumentkommentar (ganzer Absatz)" },
    ]);
    const after = await parseDocx(out);
    expect(after.map((p) => p.text)).toEqual(before.map((p) => p.text));

    const zip = await JSZip.loadAsync(out);
    const docXml = await zip.file("word/document.xml")!.async("string");
    const comments = await zip.file("word/comments.xml")!.async("string");
    expect(comments.match(/<w:comment /g)).toHaveLength(4);
    expect(docXml.match(/<w:commentRangeStart /g)).toHaveLength(4);
    expect(docXml.match(/<w:commentRangeEnd /g)).toHaveLength(4);
    expect(docXml.match(/<w:commentReference /g)).toHaveLength(4);
    expect(comments).toContain("Floskel &amp; &lt;Sonderzeichen&gt;");

    // Der Bereich für "geteilte" liegt genau um den fetten Run.
    const idx = docXml.indexOf('<w:commentRangeStart w:id="0"/>');
    const segment = docXml.slice(idx, docXml.indexOf('<w:commentRangeEnd w:id="0"/>'));
    expect(segment.replace(/<[^>]+>/g, "")).toBe("geteilte");

    for (const part of ["word/commentsExtended.xml", "word/commentsIds.xml", "word/commentsExtensible.xml"]) {
      expect(zip.file(part)).toBeTruthy();
    }
    const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(rels).toContain('Target="comments.xml"');
    const ct = await zip.file("[Content_Types].xml")!.async("string");
    expect(ct).toContain('PartName="/word/comments.xml"');
  });

  it("verträgt einen zweiten Durchlauf und vergibt fortlaufende IDs", async () => {
    const src = fixture("menschlich.docx");
    const once = await addCommentsToDocx(src, [{ paragraphIndex: 1, start: 0, end: 10, text: "eins" }]);
    const twice = await addCommentsToDocx(once, [{ paragraphIndex: 2, start: 0, end: 10, text: "zwei" }]);
    const zip = await JSZip.loadAsync(twice);
    const comments = await zip.file("word/comments.xml")!.async("string");
    expect(comments).toContain('w:id="0"');
    expect(comments).toContain('w:id="1"');
    expect(comments.match(/<w:comment /g)).toHaveLength(2);
  });

  it("kommentiert alle Fundstellen der Analyse", async () => {
    const src = fixture("ki-typisch.docx");
    const result = analyzeParagraphs(await parseDocx(src));
    const out = await addCommentsToDocx(
      src,
      result.findings.map((f) => ({ paragraphIndex: f.paragraphIndex, start: f.start, end: f.end, text: f.message })),
    );
    const zip = await JSZip.loadAsync(out);
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml.match(/<w:commentRangeStart /g)).toHaveLength(result.findings.length);
    const after = await parseDocx(out);
    expect(after.map((p) => p.text)).toEqual(result.paragraphs.map((p) => p.text));
  });
});

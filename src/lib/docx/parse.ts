import JSZip from "jszip";
import type { Element } from "@xmldom/xmldom";
import type { Paragraph, Run } from "@/lib/analysis/types";
import { childElements, descendants, firstChild, getWAttr, isElement, localName, parseXml, W_NS } from "./xml";

export const MAX_DOCX_BYTES = 10 * 1024 * 1024;

const ALLOWED_PREFIXES = ["word/", "docProps/", "_rels/", "[Content_Types].xml", "customXml/"];

export class DocxError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "DocxError";
  }
}

export async function openDocx(data: ArrayBuffer | Uint8Array | Buffer): Promise<JSZip> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new DocxError("Die Datei ist keine gültige docx-Datei (kein ZIP-Archiv).");
  }
  for (const name of Object.keys(zip.files)) {
    if (name.includes("..") || name.startsWith("/")) {
      throw new DocxError("Die docx-Datei enthält ungültige Pfade.");
    }
    if (!ALLOWED_PREFIXES.some((p) => name.startsWith(p))) {
      // Unbekannte Teile werden ignoriert, aber nicht gelesen.
      continue;
    }
  }
  if (!zip.file("word/document.xml")) {
    throw new DocxError("Die Datei enthält kein word/document.xml und ist damit kein Word-Dokument.");
  }
  return zip;
}

/** Text eines Runs: w:t, w:tab, w:br, w:cr; Feldcodes (w:instrText) werden ausgelassen. */
export function runText(run: Element): string {
  let text = "";
  const walk = (el: Element) => {
    for (const child of childElements(el)) {
      if (child.namespaceURI !== W_NS) continue;
      switch (localName(child)) {
        case "t":
          text += child.textContent ?? "";
          break;
        case "tab":
          text += "\t";
          break;
        case "br":
        case "cr":
          text += "\n";
          break;
        case "noBreakHyphen":
          text += "‑";
          break;
        case "softHyphen":
          break;
        default:
          break;
      }
    }
  };
  walk(run);
  return text;
}

function isBold(run: Element): boolean {
  const rPr = firstChild(run, "rPr");
  if (!rPr) return false;
  const b = firstChild(rPr, "b");
  if (!b) return false;
  const val = getWAttr(b, "val");
  return val === null || val === "" || val === "1" || val === "true" || val === "on";
}

const HEADING_STYLE = /^(heading|berschrift|überschrift|title|titel|subtitle|untertitel)\s*\d*$/i;

/** Alle Runs eines Absatzes in Dokumentreihenfolge, inklusive Runs in Hyperlinks, smartTags, ins. */
export function paragraphRuns(p: Element): Element[] {
  const out: Element[] = [];
  const walk = (el: Element) => {
    for (const child of childElements(el)) {
      if (child.namespaceURI !== W_NS) continue;
      const name = localName(child);
      if (name === "r") out.push(child);
      else if (name === "hyperlink" || name === "smartTag" || name === "ins" || name === "sdt" || name === "sdtContent" || name === "fldSimple") {
        walk(child);
      }
    }
  };
  walk(p);
  return out;
}

export function paragraphFromElement(p: Element, index: number): Paragraph {
  const pPr = firstChild(p, "pPr");
  let style: string | undefined;
  let isHeading = false;
  let isListItem = false;
  if (pPr) {
    const pStyle = firstChild(pPr, "pStyle");
    style = pStyle ? getWAttr(pStyle, "val") ?? undefined : undefined;
    if (style && HEADING_STYLE.test(style)) isHeading = true;
    if (firstChild(pPr, "outlineLvl")) isHeading = true;
    if (firstChild(pPr, "numPr")) isListItem = true;
  }
  const runs: Run[] = paragraphRuns(p).map((r) => ({ text: runText(r), bold: isBold(r) }));
  const text = runs.map((r) => r.text).join("");
  return { index, text, style, isHeading, isListItem, runs };
}

/** Alle w:p im Body in Dokumentreihenfolge (auch in Tabellen, Textfeldern). */
export function bodyParagraphs(documentXml: ReturnType<typeof parseXml>): Element[] {
  const body = documentXml.getElementsByTagNameNS(W_NS, "body").item(0);
  if (!body || !isElement(body)) throw new DocxError("word/document.xml enthält keinen w:body.");
  return descendants(body, "p");
}

export async function parseDocx(data: ArrayBuffer | Uint8Array | Buffer): Promise<Paragraph[]> {
  const zip = await openDocx(data);
  const xml = await zip.file("word/document.xml")!.async("string");
  const doc = parseXml(xml);
  return bodyParagraphs(doc).map((p, i) => paragraphFromElement(p, i));
}

import fs from "node:fs";
import path from "node:path";
import { analyzeParagraphs } from "@/lib/analysis/analyze";
import type { Paragraph } from "@/lib/analysis/types";
import { parseDocx } from "@/lib/docx/parse";
import { CASES, FIXTURES, type Case, type Urteil } from "./cases";

export interface Item {
  /** Eindeutig über alle Quellen, z. B. „ki-typisch#f3“. */
  key: string;
  source: string;
  ruleId: string;
  ruleName: string;
  message: string;
  matchedText: string;
  paragraphText: string;
  expected: Urteil;
}

/** Alle Fundstellen eines Absatzes; Richter bekommen je Gruppe eine Anfrage. */
export interface Group {
  key: string;
  paragraphText: string;
  items: Item[];
}

function toParagraphs(absaetze: Case["absaetze"]): Paragraph[] {
  return absaetze.map(({ text, heading }, index) => ({
    index,
    text,
    isHeading: Boolean(heading),
    isListItem: false,
    runs: [{ text, bold: false }],
  }));
}

function findingsAsItems(source: string, paragraphs: Paragraph[], expected: (matchedText: string) => Urteil | undefined): Item[] {
  const { findings } = analyzeParagraphs(paragraphs);
  return findings.map((f) => {
    const urteil = expected(f.matchedText);
    if (!urteil) throw new Error(`${source}: Fundstelle „${f.matchedText}“ (${f.ruleId}) hat kein Soll-Urteil.`);
    return {
      key: `${source}#${f.id}`,
      source,
      ruleId: f.ruleId,
      ruleName: f.ruleName,
      message: f.message,
      matchedText: f.matchedText,
      paragraphText: paragraphs[f.paragraphIndex].text,
      expected: urteil,
    };
  });
}

export function caseItems(cases: Case[] = CASES): Item[] {
  return cases.flatMap((c) => {
    const items = findingsAsItems(c.id, toParagraphs(c.absaetze), (m) => c.urteile[m]);
    const missing = Object.keys(c.urteile).filter((m) => !items.some((i) => i.matchedText === m));
    if (missing.length) throw new Error(`${c.id}: Soll-Urteil ohne Fundstelle: ${missing.map((m) => `„${m}“`).join(", ")}.`);
    return items;
  });
}

export async function fixtureItems(dir = path.resolve("tests/fixtures")): Promise<Item[]> {
  const out: Item[] = [];
  for (const name of FIXTURES) {
    const paragraphs = await parseDocx(fs.readFileSync(path.join(dir, `${name}.docx`)));
    out.push(...findingsAsItems(name, paragraphs, () => "auffaellig"));
  }
  return out;
}

export function groupByParagraph(items: Item[]): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const key = `${item.source}|${item.paragraphText}`;
    const group = groups.get(key) ?? { key, paragraphText: item.paragraphText, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

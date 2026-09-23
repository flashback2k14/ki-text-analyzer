/**
 * Versuch: Erkennen TypeSafe Jev und Claude Haiku Fehlalarme der Regeln?
 *
 * Aufruf: npm run experiment:false-positives -- [--out bericht.md]
 *
 * Umgebung (auch aus .env):
 *   TYPESAFE_API_KEY          aktiviert Jev; optional TYPESAFE_BASE_URL, TYPESAFE_MODEL (jev-latest)
 *   ANTHROPIC_API_KEY         aktiviert Claude; optional EXPERIMENT_CLAUDE_MODEL (claude-haiku-4-5)
 *
 * Ohne Keys listet der Bericht nur die Fundstellen mit Soll-Urteil. Der Text der Testfälle geht
 * an beide Anbieter, deshalb laufen hier nur die synthetischen Texte aus cases.ts und tests/fixtures.
 */
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { hasEnvCredentials } from "@/lib/llm/client";
import { caseItems, fixtureItems, groupByParagraph } from "./items";
import { claudeJudge, jevJudge, type Judge } from "./judges";
import { renderReport, runJudge } from "./report";

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const items = [...(await fixtureItems()), ...caseItems()];
  const groups = groupByParagraph(items);

  const judges: Judge[] = [];
  const typesafeKey = process.env.TYPESAFE_API_KEY?.trim();
  if (typesafeKey) {
    judges.push(jevJudge({ apiKey: typesafeKey, baseURL: process.env.TYPESAFE_BASE_URL?.trim() || undefined, model: process.env.TYPESAFE_MODEL?.trim() || undefined }));
  } else {
    console.error("TYPESAFE_API_KEY fehlt, Jev wird übersprungen.");
  }
  if (hasEnvCredentials()) {
    judges.push(claudeJudge(new Anthropic({ maxRetries: 2 }), process.env.EXPERIMENT_CLAUDE_MODEL?.trim() || undefined));
  } else {
    console.error("ANTHROPIC_API_KEY fehlt, Claude wird übersprungen.");
  }

  const runs = [];
  for (const judge of judges) {
    console.error(`${judge.name} (${judge.model}): ${groups.length} Anfragen …`);
    runs.push(await runJudge(judge, groups));
  }

  const report = renderReport(items, runs);
  const out = argValue("--out");
  if (out) {
    fs.writeFileSync(out, report);
    console.error(`Bericht in ${out} geschrieben.`);
  } else {
    process.stdout.write(report);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

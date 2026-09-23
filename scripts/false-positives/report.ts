import { PRICE_SEED } from "@/lib/costs/seed";
import type { Group, Item } from "./items";
import type { Judge, Verdict } from "./judges";

export interface JudgeRun {
  judge: Judge;
  verdicts: Map<string, Verdict>;
  latenciesMs: number[];
  inputTokens: number;
  outputTokens: number;
  errors: string[];
}

/** Fragt Gruppe für Gruppe nacheinander, damit die gemessenen Zeiten nicht von Parallelität abhängen. */
export async function runJudge(judge: Judge, groups: Group[], now: () => number = performance.now.bind(performance)): Promise<JudgeRun> {
  const run: JudgeRun = { judge, verdicts: new Map(), latenciesMs: [], inputTokens: 0, outputTokens: 0, errors: [] };
  for (const group of groups) {
    const start = now();
    try {
      const res = await judge.judge(group);
      run.latenciesMs.push(now() - start);
      run.inputTokens += res.inputTokens;
      run.outputTokens += res.outputTokens;
      for (const [key, v] of res.verdicts) run.verdicts.set(key, v);
    } catch (err) {
      run.errors.push(`${group.items[0].source}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return run;
}

export interface Metrics {
  total: number;
  answered: number;
  correct: number;
  /** Fehlalarme, die als Fehlalarm erkannt wurden. */
  fehlalarmErkannt: number;
  fehlalarmGesamt: number;
  /** Echte Auffälligkeiten, die fälschlich als Fehlalarm aussortiert wurden. */
  echteVerworfen: number;
  echteGesamt: number;
}

export function metrics(items: Item[], verdicts: Map<string, Verdict>): Metrics {
  const m: Metrics = { total: items.length, answered: 0, correct: 0, fehlalarmErkannt: 0, fehlalarmGesamt: 0, echteVerworfen: 0, echteGesamt: 0 };
  for (const item of items) {
    const v = verdicts.get(item.key);
    if (item.expected === "fehlalarm") m.fehlalarmGesamt++;
    else m.echteGesamt++;
    if (!v) continue;
    m.answered++;
    if (v.urteil === item.expected) m.correct++;
    if (item.expected === "fehlalarm" && v.urteil === "fehlalarm") m.fehlalarmErkannt++;
    if (item.expected === "auffaellig" && v.urteil === "fehlalarm") m.echteVerworfen++;
  }
  return m;
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

/** Kosten in USD aus den Anthropic-Preisen der App; für andere Anbieter null. */
export function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICE_SEED.find((p) => p.model === model);
  if (!price) return null;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

const ms = (v: number | null) => (v === null ? "–" : `${Math.round(v)} ms`);
const ratio = (a: number, b: number) => (b === 0 ? "–" : `${a}/${b} (${Math.round((a / b) * 100)} %)`);
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ");

export function renderReport(items: Item[], runs: JudgeRun[], date = new Date()): string {
  const lines: string[] = [];
  lines.push(`# Vergleich: Fehlalarme der Regeln erkennen`, "");
  lines.push(
    `Stand ${date.toISOString().slice(0, 10)}. ${items.length} Fundstellen, davon ${items.filter((i) => i.expected === "fehlalarm").length} Fehlalarme ` +
      `und ${items.filter((i) => i.expected === "auffaellig").length} echte Auffälligkeiten.`,
    "",
  );
  if (runs.length === 0) {
    lines.push("Kein Prüfer lief. `TYPESAFE_API_KEY` und `ANTHROPIC_API_KEY` fehlen.", "");
  } else {
    lines.push("| Prüfer | Modell | Richtig | Fehlalarme erkannt | Echte verworfen | Median | p90 | Token ein/aus | Kosten |");
    lines.push("|---|---|---|---|---|---|---|---|---|");
    for (const run of runs) {
      const m = metrics(items, run.verdicts);
      const cost = costUsd(run.judge.model, run.inputTokens, run.outputTokens);
      lines.push(
        `| ${run.judge.name} | ${run.judge.model} | ${ratio(m.correct, m.answered)} | ${ratio(m.fehlalarmErkannt, m.fehlalarmGesamt)} | ` +
          `${ratio(m.echteVerworfen, m.echteGesamt)} | ${ms(percentile(run.latenciesMs, 50))} | ${ms(percentile(run.latenciesMs, 90))} | ` +
          `${run.inputTokens}/${run.outputTokens} | ${cost === null ? "–" : `${cost.toFixed(4)} $`} |`,
      );
    }
    lines.push("", "Zeiten gelten je Anfrage, eine Anfrage je Absatz. „Echte verworfen“ zählt Treffer, die ein Filter fälschlich ausblenden würde.", "");
    for (const run of runs.filter((r) => r.errors.length)) {
      lines.push(`**Fehler bei ${run.judge.name}:**`, "", ...run.errors.map((e) => `- ${e}`), "");
    }
  }

  lines.push("## Fundstellen", "", "✗ markiert ein falsches Urteil. Die Zahl in Klammern ist Jevs Wahrscheinlichkeit für „fehlalarm“.", "");
  const heads = ["Quelle", "Regel", "Markiert", "Soll", ...runs.map((r) => r.judge.name)];
  lines.push(`| ${heads.join(" | ")} |`, `|${heads.map(() => "---|").join("")}`);
  for (const item of items) {
    const cols = runs.map((r) => {
      const v = r.verdicts.get(item.key);
      if (!v) return "–";
      const p = v.pFehlalarm === undefined ? "" : ` (${v.pFehlalarm.toFixed(2)})`;
      return `${v.urteil === item.expected ? "" : "**✗** "}${v.urteil}${p}`;
    });
    lines.push(`| ${[item.key, item.ruleId, `„${cell(item.matchedText)}“`, item.expected, ...cols].join(" | ")} |`);
  }
  lines.push("");
  return lines.join("\n");
}

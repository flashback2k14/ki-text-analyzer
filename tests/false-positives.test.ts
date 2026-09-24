import { describe, expect, it, vi } from "vitest";
import type { ParseClient } from "@/lib/llm/suggest";
import { CASES, type Case } from "../scripts/false-positives/cases";
import { caseItems, fixtureItems, groupByParagraph, type Group, type Item } from "../scripts/false-positives/items";
import { claudeJudge, jevJudge, type Fetch, type Judge } from "../scripts/false-positives/judges";
import { costUsd, metrics, percentile, renderReport, runJudge } from "../scripts/false-positives/report";

function item(key: string, expected: Item["expected"], paragraphText = "Ein Absatz."): Item {
  return { key, source: key.split("#")[0], ruleId: "r", ruleName: "Regel", message: "Hinweis.", matchedText: key, paragraphText, expected };
}

describe("Testmaterial", () => {
  it("hat für jede Fundstelle der Fälle ein Soll-Urteil und umgekehrt", () => {
    const items = caseItems();
    for (const c of CASES) expect(items.filter((i) => i.source === c.id)).toHaveLength(Object.keys(c.urteile).length);
    expect(items.filter((i) => i.expected === "fehlalarm").length).toBeGreaterThanOrEqual(10);
  });

  it("meldet Fundstellen ohne Soll-Urteil und Soll-Urteile ohne Fundstelle", () => {
    const ohneUrteil: Case = { id: "x", absaetze: [{ text: "Das ist nahtlos." }], urteile: {} };
    expect(() => caseItems([ohneUrteil])).toThrow(/kein Soll-Urteil/);
    const ohneFund: Case = { id: "y", absaetze: [{ text: "Ein schlichter Satz." }], urteile: { nahtlos: "fehlalarm" } };
    expect(() => caseItems([ohneFund])).toThrow(/ohne Fundstelle/);
  });

  it("übernimmt alle Fundstellen der Fixtures als echte Auffälligkeiten", async () => {
    const items = await fixtureItems();
    expect(items.length).toBeGreaterThan(30);
    expect(items.every((i) => i.expected === "auffaellig")).toBe(true);
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
  });

  it("gruppiert Fundstellen je Absatz und Quelle", () => {
    const groups = groupByParagraph([item("a#f1", "auffaellig", "A"), item("a#f2", "fehlalarm", "A"), item("b#f1", "auffaellig", "A")]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
  });
});

const group: Group = { key: "g", paragraphText: "Das Werk fertigt nahtlose Rohre.", items: [item("s#f1", "fehlalarm"), item("s#f2", "auffaellig")] };

describe("jevJudge", () => {
  it("stellt je Fundstelle eine Choice-Frage und liest Urteil und Wahrscheinlichkeit", async () => {
    const fetch = vi.fn<Fetch>(async () =>
      new Response(
        JSON.stringify({
          model: "jev-1",
          answers: {
            q0: { type: "choice", choice: "fehlalarm", confidence: 0.9, probabilities: { auffaellig: 0.1, fehlalarm: 0.9 } },
            q1: { type: "choice", choice: "auffaellig", confidence: 0.7, probabilities: { auffaellig: 0.7, fehlalarm: 0.3 } },
          },
          usage: { input_tokens: 120, output_tokens: 4 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const res = await jevJudge({ apiKey: "k", baseURL: "https://example.test/", fetch }).judge(group);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://example.test/v1/systemone");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("jev-latest");
    expect(body.state).toEqual({ absatz: group.paragraphText });
    expect(Object.keys(body.questions)).toEqual(["q0", "q1"]);
    expect(body.questions.q0.type).toBe("choice");
    expect(Object.keys(body.questions.q0.criteria)).toEqual(["auffaellig", "fehlalarm"]);
    expect(res.verdicts.get("s#f1")).toEqual({ urteil: "fehlalarm", pFehlalarm: 0.9 });
    expect(res.verdicts.get("s#f2")).toEqual({ urteil: "auffaellig", pFehlalarm: 0.3 });
    expect(res.inputTokens).toBe(120);
  });

  it("wirft bei einem Fehlerstatus", async () => {
    const fetch = vi.fn(async () => new Response("nope", { status: 401 }));
    await expect(jevJudge({ apiKey: "k", fetch }).judge(group)).rejects.toThrow(/Status 401/);
  });
});

describe("claudeJudge", () => {
  it("ordnet die Urteile über die Fragen-IDs zu", async () => {
    const parse = vi.fn(async () => ({
      stop_reason: "end_turn",
      usage: { input_tokens: 300, output_tokens: 40 },
      parsed_output: { urteile: [{ id: "q1", urteil: "auffaellig" }, { id: "q0", urteil: "auffaellig" }, { id: "q9", urteil: "fehlalarm" }] },
    }));
    const client = { messages: { parse } } as unknown as ParseClient;
    const res = await claudeJudge(client).judge(group);
    const params = (parse.mock.calls[0] as unknown as [{ model: string; output_config: unknown; messages: { content: string }[] }])[0];
    expect(params.model).toBe("claude-haiku-4-5");
    expect(params.output_config).toBeTruthy();
    expect(params.messages[0].content).toContain("q1: Im Absatz wurde");
    expect(res.verdicts.size).toBe(2);
    expect(res.verdicts.get("s#f1")).toEqual({ urteil: "auffaellig" });
    expect(res.outputTokens).toBe(40);
  });
});

describe("Auswertung", () => {
  const items = [item("a#f1", "fehlalarm"), item("a#f2", "fehlalarm"), item("a#f3", "auffaellig"), item("a#f4", "auffaellig")];

  it("zählt erkannte Fehlalarme und fälschlich verworfene Treffer", () => {
    const verdicts = new Map([
      ["a#f1", { urteil: "fehlalarm" as const }],
      ["a#f2", { urteil: "auffaellig" as const }],
      ["a#f3", { urteil: "fehlalarm" as const }],
    ]);
    expect(metrics(items, verdicts)).toEqual({
      total: 4, answered: 3, correct: 1, fehlalarmErkannt: 1, fehlalarmGesamt: 2, echteVerworfen: 1, echteGesamt: 2,
    });
  });

  it("berechnet Perzentile und Kosten", () => {
    expect(percentile([30, 10, 20, 40], 50)).toBe(20);
    expect(percentile([30, 10, 20, 40], 90)).toBe(40);
    expect(percentile([], 50)).toBeNull();
    expect(costUsd("claude-haiku-4-5", 1_000_000, 100_000)).toBeCloseTo(1.5);
    expect(costUsd("jev-latest", 1, 1)).toBeNull();
  });

  it("läuft weiter, wenn eine Anfrage scheitert, und schreibt den Bericht", async () => {
    let t = 0;
    const judge: Judge = {
      name: "Test",
      model: "claude-haiku-4-5",
      judge: vi.fn(async (g: Group) => {
        if (g.key === "kaputt") throw new Error("Zeitüberschreitung");
        return { verdicts: new Map(g.items.map((i) => [i.key, { urteil: "fehlalarm" as const }])), inputTokens: 10, outputTokens: 2 };
      }),
    };
    const groups: Group[] = [
      { key: "ok", paragraphText: "A", items: items.slice(0, 2) },
      { key: "kaputt", paragraphText: "B", items: items.slice(2) },
    ];
    const run = await runJudge(judge, groups, () => (t += 100));
    expect(run.verdicts.size).toBe(2);
    expect(run.errors).toEqual(["a: Zeitüberschreitung"]);
    expect(run.latenciesMs).toEqual([100]);
    const report = renderReport(items, [run], new Date("2026-09-23"));
    expect(report).toContain("| Test | claude-haiku-4-5 | 2/2 (100 %) | 2/2 (100 %) | 0/2 (0 %) |");
    expect(report).toContain("Zeitüberschreitung");
    expect(report).toContain("| a#f3 | r | „a#f3“ | auffaellig | – |");
  });
});

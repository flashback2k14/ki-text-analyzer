import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ParseClient } from "@/lib/llm/suggest";
import type { Urteil } from "./cases";
import type { Group, Item } from "./items";

export interface Verdict {
  urteil: Urteil;
  /** Wahrscheinlichkeit für „fehlalarm“, sofern der Prüfer eine liefert. */
  pFehlalarm?: number;
}

export interface GroupResult {
  verdicts: Map<string, Verdict>;
  inputTokens: number;
  outputTokens: number;
}

export interface Judge {
  name: string;
  model: string;
  judge(group: Group): Promise<GroupResult>;
}

/** Beide Prüfer bekommen dieselbe Frage und dieselben Antwortoptionen. */
export const CRITERIA: Record<Urteil, string> = {
  auffaellig: "Die Markierung ist berechtigt. Die Stelle ist ein Stilmerkmal, wie es in KI-generierten Texten gehäuft vorkommt, und sollte überarbeitet werden.",
  fehlalarm: "Die Markierung ist ein Fehlalarm. Der Ausdruck ist hier wörtlich, fachsprachlich oder mit Beleg verwendet und sollte nicht markiert werden.",
};

export function question(item: Item): string {
  return (
    `Im Absatz wurde „${item.matchedText}“ markiert. Regel: ${item.ruleName}. Hinweis der Regel: ${item.message} ` +
    `Ist die Markierung in diesem Absatz berechtigt oder ein Fehlalarm?`
  );
}

// ---------- TypeSafe Jev ----------

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const JevResponse = z.object({
  model: z.string().optional(),
  answers: z.record(
    z.string(),
    z.object({
      choice: z.enum(["auffaellig", "fehlalarm"]),
      probabilities: z.record(z.string(), z.number()).optional(),
    }),
  ),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).optional(),
});

export interface JevOptions {
  apiKey: string;
  baseURL?: string;
  model?: string;
  fetch?: Fetch;
}

/**
 * Ruft POST /v1/systemone direkt auf (Form wie im offiziellen SDK @typesafe-ai/sdk 0.6):
 * je Fundstelle eine Choice-Frage gegen den Absatz als State.
 */
export function jevJudge({ apiKey, baseURL = "https://api.typesafe.ai", model = "jev-latest", fetch: doFetch = fetch }: JevOptions): Judge {
  const url = `${baseURL.replace(/\/+$/, "")}/v1/systemone`;
  return {
    name: "TypeSafe Jev",
    model,
    async judge(group) {
      const names = group.items.map((_, i) => `q${i}`);
      const questions = Object.fromEntries(
        group.items.map((item, i) => [names[i], { type: "choice", instructions: question(item), criteria: CRITERIA }]),
      );
      const res = await doFetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, state: { absatz: group.paragraphText }, questions }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`TypeSafe antwortet mit Status ${res.status}: ${text.slice(0, 300)}`);
      const parsed = JevResponse.parse(JSON.parse(text));
      const verdicts = new Map<string, Verdict>();
      group.items.forEach((item, i) => {
        const answer = parsed.answers[names[i]];
        if (answer) verdicts.set(item.key, { urteil: answer.choice, pFehlalarm: answer.probabilities?.fehlalarm });
      });
      return { verdicts, inputTokens: parsed.usage?.input_tokens ?? 0, outputTokens: parsed.usage?.output_tokens ?? 0 };
    },
  };
}

// ---------- Claude ----------

const ClaudeSchema = z.object({
  urteile: z.array(z.object({ id: z.string(), urteil: z.enum(["auffaellig", "fehlalarm"]) })),
});

const CLAUDE_SYSTEM =
  "Du prüfst Markierungen eines regelbasierten Detektors für typische Merkmale KI-generierter deutscher Texte. " +
  "Beantworte jede Frage einzeln mit einer der beiden Optionen.\n\n" +
  `auffaellig: ${CRITERIA.auffaellig}\n` +
  `fehlalarm: ${CRITERIA.fehlalarm}`;

export function claudeJudge(client: ParseClient, model = "claude-haiku-4-5"): Judge {
  return {
    name: "Claude",
    model,
    async judge(group) {
      const ids = group.items.map((_, i) => `q${i}`);
      const fragen = group.items.map((item, i) => `${ids[i]}: ${question(item)}`).join("\n");
      const response = await client.messages.parse({
        model,
        max_tokens: 2000,
        system: CLAUDE_SYSTEM,
        messages: [{ role: "user", content: `<absatz>\n${group.paragraphText}\n</absatz>\n\n${fragen}` }],
        output_config: { format: zodOutputFormat(ClaudeSchema) },
      });
      if (!response.parsed_output) throw new Error(`Claude hat keine lesbare Antwort geliefert (stop_reason: ${response.stop_reason}).`);
      const verdicts = new Map<string, Verdict>();
      for (const u of response.parsed_output.urteile) {
        const i = ids.indexOf(u.id);
        if (i >= 0 && !verdicts.has(group.items[i].key)) verdicts.set(group.items[i].key, { urteil: u.urteil });
      }
      return { verdicts, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    },
  };
}

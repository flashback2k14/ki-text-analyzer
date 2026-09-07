import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORY_LABELS, type Category } from "@/lib/analysis/types";
import { LlmError, toLlmError } from "./client";
import { ASSESSMENT_INSTRUCTIONS, STYLE_RULES } from "./prompts";

export interface SuggestItem {
  id: string;
  category: Category;
  ruleName: string;
  message: string;
  matchedText: string;
  /** Der vollständige Absatz, in dem die Stelle steht. */
  paragraphText: string;
}

export interface Suggestion {
  alternative: string;
  begruendung: string;
}

export interface Assessment {
  einschaetzung: string;
  wahrscheinlichkeit: "niedrig" | "mittel" | "hoch";
  auffaelligkeiten: string[];
  staerken: string[];
}

const SuggestSchema = z.object({
  suggestions: z.array(
    z.object({
      findingId: z.string(),
      alternative: z.string(),
      begruendung: z.string(),
    }),
  ),
});

const AssessmentSchema = z.object({
  einschaetzung: z.string(),
  wahrscheinlichkeit: z.enum(["niedrig", "mittel", "hoch"]),
  auffaelligkeiten: z.array(z.string()),
  staerken: z.array(z.string()),
});

export const CHUNK_SIZE = 15;

/** Minimale Schnittstelle, damit Tests einen Mock übergeben können. */
export type ParseClient = Pick<Anthropic, "messages">;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function renderItems(items: SuggestItem[]): string {
  return items
    .map(
      (it, i) =>
        `### Fundstelle ${i + 1} (findingId: ${it.id})\n` +
        `Kategorie: ${CATEGORY_LABELS[it.category]} (${it.ruleName})\n` +
        `Hinweis: ${it.message}\n` +
        `Markierte Stelle: „${it.matchedText}“\n` +
        `Absatz: ${it.paragraphText}`,
    )
    .join("\n\n");
}

async function parseOrThrow<T>(promise: Promise<{ parsed_output: T | null; stop_reason: string | null }>): Promise<T> {
  let response;
  try {
    response = await promise;
  } catch (err) {
    throw toLlmError(err);
  }
  if (response.stop_reason === "refusal") {
    throw new LlmError("Das Sprachmodell hat die Anfrage abgelehnt.", 502, "refusal");
  }
  if (response.stop_reason === "max_tokens") {
    throw new LlmError("Die Antwort des Sprachmodells wurde abgeschnitten. Bitte mit weniger Fundstellen erneut versuchen.", 502, "parse");
  }
  if (!response.parsed_output) {
    throw new LlmError("Die Antwort des Sprachmodells konnte nicht gelesen werden.", 502, "parse");
  }
  return response.parsed_output;
}

/** Holt für jede Fundstelle eine alternative Formulierung (gebündelt in Chunks). */
export async function suggestAlternatives(client: ParseClient, model: string, items: SuggestItem[]): Promise<Map<string, Suggestion>> {
  const result = new Map<string, Suggestion>();
  if (items.length === 0) return result;
  const known = new Set(items.map((i) => i.id));

  const chunks = chunk(items, CHUNK_SIZE);
  const responses = await Promise.all(
    chunks.map((part) =>
      parseOrThrow(
        client.messages.parse({
          model,
          max_tokens: 16000,
          system: [{ type: "text", text: STYLE_RULES, cache_control: { type: "ephemeral" } }],
          messages: [
            {
              role: "user",
              content:
                `Für jede der folgenden Fundstellen: Gib genau einen Eintrag mit derselben findingId, einer alternativen Formulierung und einer einsätzigen Begründung.\n\n` +
                renderItems(part),
            },
          ],
          output_config: { format: zodOutputFormat(SuggestSchema) },
        }),
      ),
    ),
  );

  for (const res of responses) {
    for (const s of res.suggestions) {
      if (!known.has(s.findingId) || result.has(s.findingId)) continue;
      const alternative = s.alternative.trim();
      if (!alternative) continue;
      result.set(s.findingId, { alternative, begruendung: s.begruendung.trim() });
    }
  }
  return result;
}

export const MAX_ASSESSMENT_WORDS = 30000;

/** Kürzt sehr lange Texte auf Anfang, Mitte und Ende. */
export function excerptForAssessment(text: string, maxWords = MAX_ASSESSMENT_WORDS): { text: string; truncated: boolean } {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return { text, truncated: false };
  const part = Math.floor(maxWords / 3);
  const mid = Math.floor(words.length / 2);
  const pieces = [words.slice(0, part), words.slice(mid - Math.floor(part / 2), mid + Math.ceil(part / 2)), words.slice(-part)];
  return { text: pieces.map((p) => p.join(" ")).join("\n\n[…]\n\n"), truncated: true };
}

export async function assessDocument(client: ParseClient, model: string, fullText: string): Promise<Assessment & { truncated: boolean }> {
  const { text, truncated } = excerptForAssessment(fullText);
  const parsed = await parseOrThrow(
    client.messages.parse({
      model,
      max_tokens: 16000,
      system: [{ type: "text", text: ASSESSMENT_INSTRUCTIONS, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Bewerte den folgenden Text.${truncated ? " Er wurde auf Anfang, Mitte und Ende gekürzt." : ""}\n\n<text>\n${text}\n</text>`,
        },
      ],
      output_config: { format: zodOutputFormat(AssessmentSchema) },
    }),
  );
  return { ...parsed, truncated };
}

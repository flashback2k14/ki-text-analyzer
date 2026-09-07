import { describe, expect, it, vi } from "vitest";
import { LlmError } from "@/lib/llm/client";
import { assessDocument, CHUNK_SIZE, chunk, excerptForAssessment, suggestAlternatives, type ParseClient, type SuggestItem } from "@/lib/llm/suggest";

function item(i: number): SuggestItem {
  return { id: `f${i}`, category: "bedeutung", ruleName: "Test", message: "Hinweis", matchedText: `Stelle ${i}`, paragraphText: `Absatz mit Stelle ${i}.` };
}

function mockClient(impl: (params: { messages: { content: unknown }[] }) => unknown): ParseClient & { parse: ReturnType<typeof vi.fn> } {
  const parse = vi.fn(async (params: { messages: { content: unknown }[] }) => impl(params));
  return { messages: { parse } as unknown as ParseClient["messages"], parse };
}

describe("chunk", () => {
  it("teilt in Blöcke der gewünschten Größe", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("suggestAlternatives", () => {
  it("bündelt Fundstellen in Chunks und ordnet Antworten per findingId zu", async () => {
    const items = Array.from({ length: CHUNK_SIZE + 3 }, (_, i) => item(i));
    const client = mockClient((params) => {
      const content = String(params.messages[0].content);
      const ids = [...content.matchAll(/findingId: (f\d+)/g)].map((m) => m[1]);
      return {
        stop_reason: "end_turn",
        parsed_output: {
          suggestions: [
            ...ids.map((id) => ({ findingId: id, alternative: `Alt ${id}`, begruendung: `Weil ${id}` })),
            { findingId: "unbekannt", alternative: "x", begruendung: "y" },
          ],
        },
      };
    });
    const result = await suggestAlternatives(client, "claude-opus-5", items);
    expect(client.parse).toHaveBeenCalledTimes(2);
    expect(result.size).toBe(items.length);
    expect(result.get("f0")).toEqual({ alternative: "Alt f0", begruendung: "Weil f0" });
    expect(result.has("unbekannt")).toBe(false);
    const firstCall = client.parse.mock.calls[0][0] as { model: string; output_config: unknown; system: unknown };
    expect(firstCall.model).toBe("claude-opus-5");
    expect(firstCall.output_config).toBeTruthy();
  });

  it("ruft die API bei null Fundstellen nicht auf", async () => {
    const client = mockClient(() => ({ stop_reason: "end_turn", parsed_output: { suggestions: [] } }));
    expect((await suggestAlternatives(client, "m", [])).size).toBe(0);
    expect(client.parse).not.toHaveBeenCalled();
  });

  it("wirft bei refusal einen LlmError", async () => {
    const client = mockClient(() => ({ stop_reason: "refusal", parsed_output: null }));
    await expect(suggestAlternatives(client, "m", [item(1)])).rejects.toMatchObject({ reason: "refusal" });
  });

  it("wirft bei fehlender parsed_output einen LlmError", async () => {
    const client = mockClient(() => ({ stop_reason: "end_turn", parsed_output: null }));
    await expect(suggestAlternatives(client, "m", [item(1)])).rejects.toBeInstanceOf(LlmError);
  });

  it("übersetzt Netzwerkfehler", async () => {
    const client = mockClient(() => {
      throw new Error("kaputt");
    });
    await expect(suggestAlternatives(client, "m", [item(1)])).rejects.toMatchObject({ status: 500 });
  });
});

describe("assessDocument", () => {
  it("liefert die Einschätzung und kürzt sehr lange Texte", async () => {
    const client = mockClient(() => ({
      stop_reason: "end_turn",
      parsed_output: { einschaetzung: "Wirkt generiert.", wahrscheinlichkeit: "hoch", auffaelligkeiten: ["Fazit"], staerken: [] },
    }));
    const short = await assessDocument(client, "m", "Kurzer Text.");
    expect(short.wahrscheinlichkeit).toBe("hoch");
    expect(short.truncated).toBe(false);

    const long = Array.from({ length: 40000 }, (_, i) => `w${i}`).join(" ");
    const { text, truncated } = excerptForAssessment(long);
    expect(truncated).toBe(true);
    expect(text.split(/\s+/).length).toBeLessThan(31000);
    expect(text).toContain("[…]");
  });
});

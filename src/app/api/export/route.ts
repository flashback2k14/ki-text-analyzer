import { z } from "zod";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/analysis/types";
import { addCommentsToDocx, type CommentSpec } from "@/lib/docx/comments";
import { DocxError } from "@/lib/docx/parse";
import { requireUser, unauthorizedResponse } from "@/lib/auth/dal";
import { errorResponse, readUploadedDocx } from "@/lib/docx/upload";

export const dynamic = "force-dynamic";

const FindingsSchema = z.array(
  z.object({
    paragraphIndex: z.number().int().min(0),
    start: z.number().int().min(0),
    end: z.number().int().min(0),
    category: z.enum(CATEGORIES as [string, ...string[]]),
    ruleName: z.string(),
    message: z.string(),
    matchedText: z.string().optional(),
    suggestion: z.string().optional(),
    suggestionSource: z.enum(["rule", "llm"]).optional(),
    suggestionReason: z.string().optional(),
  }),
);

const SummarySchema = z
  .object({
    scoreValue: z.number(),
    scoreLabel: z.string(),
    reasons: z.array(z.string()),
    words: z.number(),
    findings: z.number(),
    assessment: z.string().optional(),
  })
  .optional();

function commentText(f: z.infer<typeof FindingsSchema>[number]): string {
  const lines = [`${CATEGORY_LABELS[f.category as Category]} (${f.ruleName})`, f.message];
  if (f.suggestion) {
    lines.push("");
    lines.push(`${f.suggestionSource === "llm" ? "Alternative (Claude)" : "Vorschlag"}: ${f.suggestion}`);
    if (f.suggestionReason) lines.push(`Begründung: ${f.suggestionReason}`);
  }
  return lines.join("\n");
}

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch {
    return unauthorizedResponse();
  }
  try {
    const clone = request.clone();
    const { name, bytes } = await readUploadedDocx(request);
    const form = await clone.formData();

    let findings: z.infer<typeof FindingsSchema>;
    let summary: z.infer<typeof SummarySchema>;
    try {
      findings = FindingsSchema.parse(JSON.parse(String(form.get("findings") ?? "[]")));
      const rawSummary = form.get("summary");
      summary = rawSummary ? SummarySchema.parse(JSON.parse(String(rawSummary))) : undefined;
    } catch {
      throw new DocxError("Die Fundstellen konnten nicht gelesen werden.");
    }

    const comments: CommentSpec[] = [];
    if (summary) {
      const lines = [
        `KI-Text-Analyzer: Score ${summary.scoreValue}/100 (${summary.scoreLabel}), ${summary.findings} Fundstellen auf ${summary.words} Wörter.`,
        ...summary.reasons.map((r) => `• ${r}`),
      ];
      if (summary.assessment) {
        lines.push("");
        lines.push(`Einschätzung des Sprachmodells: ${summary.assessment}`);
      }
      lines.push("");
      lines.push("Hinweis: Kein einzelnes Merkmal beweist maschinelle Herkunft; verdächtig ist die Häufung.");
      comments.push({ paragraphIndex: 0, start: 0, end: 0, text: lines.join("\n") });
    }
    for (const f of findings) {
      comments.push({ paragraphIndex: f.paragraphIndex, start: f.start, end: f.end, text: commentText(f) });
    }

    const out = await addCommentsToDocx(bytes, comments);
    const baseName = name.replace(/\.docx$/i, "");
    const asciiName = `${baseName.replace(/[^\x20-\x7E]/g, "_")}-kommentiert.docx`;
    const utf8Name = encodeURIComponent(`${baseName}-kommentiert.docx`);
    return new Response(out as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

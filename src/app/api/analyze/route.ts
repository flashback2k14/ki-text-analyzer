import { analyzeParagraphs } from "@/lib/analysis/analyze";
import { parseDocx } from "@/lib/docx/parse";
import { errorResponse, readUploadedDocx } from "@/lib/docx/upload";
import { hasApiCredentials } from "@/lib/llm/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, bytes } = await readUploadedDocx(request);
    const paragraphs = await parseDocx(bytes);
    const result = analyzeParagraphs(paragraphs);
    return Response.json({ fileName: name, llmAvailable: hasApiCredentials(), ...result });
  } catch (err) {
    return errorResponse(err);
  }
}

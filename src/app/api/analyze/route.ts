import { analyzeParagraphs } from "@/lib/analysis/analyze";
import { getUserApiKey, requireUser, unauthorizedResponse } from "@/lib/auth/dal";
import type { User } from "@/lib/auth/users";
import { parseDocx } from "@/lib/docx/parse";
import { errorResponse, readUploadedDocx } from "@/lib/docx/upload";
import { llmAvailableFor } from "@/lib/llm/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let user: User;
  try {
    user = await requireUser();
  } catch {
    return unauthorizedResponse();
  }
  try {
    const { name, bytes } = await readUploadedDocx(request);
    const paragraphs = await parseDocx(bytes);
    const result = analyzeParagraphs(paragraphs);
    return Response.json({ fileName: name, llmAvailable: llmAvailableFor(getUserApiKey(user.id)), ...result });
  } catch (err) {
    return errorResponse(err);
  }
}

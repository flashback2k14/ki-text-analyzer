import { DocxError, MAX_DOCX_BYTES } from "./parse";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Liest die hochgeladene docx-Datei aus einem multipart-Formular und prüft Typ und Größe. */
export async function readUploadedDocx(request: Request, field = "file"): Promise<{ name: string; bytes: Uint8Array }> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new DocxError("Die Anfrage enthält kein gültiges Formular mit einer Datei.");
  }
  const file = form.get(field);
  if (!(file instanceof File)) throw new DocxError("Es wurde keine Datei hochgeladen.");
  const name = file.name || "dokument.docx";
  const looksDocx = name.toLowerCase().endsWith(".docx") || file.type === DOCX_MIME;
  if (!looksDocx) throw new DocxError("Bitte eine .docx-Datei hochladen. Andere Formate werden nicht unterstützt.");
  if (file.size > MAX_DOCX_BYTES) {
    throw new DocxError(`Die Datei ist zu groß (maximal ${Math.round(MAX_DOCX_BYTES / 1024 / 1024)} MB).`, 413);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { name, bytes };
}

export function errorResponse(err: unknown): Response {
  if (err instanceof DocxError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: "Unerwarteter Fehler bei der Verarbeitung." }, { status: 500 });
}

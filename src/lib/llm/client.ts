import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-opus-5";

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasApiCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

let cached: Anthropic | null = null;

/** Liefert den Client oder null, wenn keine Zugangsdaten konfiguriert sind. */
export function getClient(): Anthropic | null {
  if (!hasApiCredentials()) return null;
  if (!cached) cached = new Anthropic({ maxRetries: 2, timeout: 10 * 60 * 1000 });
  return cached;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason: "no_api_key" | "auth" | "rate_limit" | "api" | "network" | "refusal" | "parse",
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** Übersetzt SDK-Fehler in eine verständliche deutsche Meldung mit HTTP-Status. */
export function toLlmError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new LlmError("Der Anthropic-API-Key wurde abgelehnt. Bitte ANTHROPIC_API_KEY prüfen.", 502, "auth");
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new LlmError("Der API-Key hat keine Berechtigung für dieses Modell.", 502, "auth");
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new LlmError(`Das Modell „${getModel()}“ wurde nicht gefunden. Bitte ANTHROPIC_MODEL prüfen.`, 502, "api");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new LlmError("Die Anthropic API meldet ein Ratenlimit. Bitte in einer Minute erneut versuchen.", 429, "rate_limit");
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new LlmError(`Die Anthropic API hat die Anfrage abgelehnt: ${err.message}`, 502, "api");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new LlmError("Die Anthropic API ist nicht erreichbar (Netzwerkfehler oder Zeitüberschreitung).", 504, "network");
  }
  if (err instanceof Anthropic.APIError) {
    return new LlmError(`Die Anthropic API antwortet mit Status ${err.status ?? "unbekannt"}: ${err.message}`, 502, "api");
  }
  const message = err instanceof Error ? err.message : String(err);
  return new LlmError(`Unerwarteter Fehler beim Aufruf des Sprachmodells: ${message}`, 500, "api");
}

import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL, resolveModel } from "./models";

export { DEFAULT_MODEL, resolveModel };

/** Serverweiter Fallback-Key aus der Umgebung. */
export function hasEnvCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

export function llmAvailableFor(userKey: string | null): boolean {
  return Boolean(userKey) || hasEnvCredentials();
}

/** Client mit dem Key des Users, sonst mit den Umgebungs-Zugangsdaten, sonst null. */
export function createClient(userKey: string | null): Anthropic | null {
  const options = { maxRetries: 2, timeout: 10 * 60 * 1000 };
  if (userKey) return new Anthropic({ apiKey: userKey, ...options });
  if (hasEnvCredentials()) return new Anthropic(options);
  return null;
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
export function toLlmError(err: unknown, model?: string): LlmError {
  if (err instanceof LlmError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new LlmError("Der Anthropic-API-Key wurde abgelehnt. Bitte den Key unter „Konto“ prüfen.", 502, "auth");
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new LlmError("Der API-Key hat keine Berechtigung für dieses Modell.", 502, "auth");
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new LlmError(`Das Modell „${model ?? "unbekannt"}“ wurde nicht gefunden. Bitte die Modellauswahl unter „Konto“ prüfen.`, 502, "api");
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

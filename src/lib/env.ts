import { createHash } from "node:crypto";

/**
 * Leitet aus APP_SECRET einen 32-Byte-Schlüssel für die Verschlüsselung der API-Keys ab.
 * Das Secret ist ein beliebiger String mit mindestens 32 Zeichen (z. B. Base64 aus `openssl rand -base64 32`).
 */
export function getAppSecret(env: Record<string, string | undefined> = process.env): Buffer {
  const raw = env.APP_SECRET?.trim();
  if (!raw) {
    throw new Error("APP_SECRET fehlt. Bitte in der .env setzen, z. B. mit: openssl rand -base64 32");
  }
  if (raw.length < 32) {
    throw new Error("APP_SECRET ist zu kurz. Es muss mindestens 32 Zeichen lang sein, z. B. aus: openssl rand -base64 32");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function getDataDir(env: Record<string, string | undefined> = process.env): string {
  return env.DATA_DIR?.trim() || "./data";
}

export function getRegistrationCode(env: Record<string, string | undefined> = process.env): string | null {
  const code = env.REGISTRATION_CODE?.trim();
  return code ? code : null;
}

export function isCookieSecure(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV !== "production") return false;
  return !(env.SESSION_COOKIE_INSECURE === "true" || env.SESSION_COOKIE_INSECURE === "1");
}

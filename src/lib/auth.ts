import { timingSafeEqual } from "node:crypto";

export interface AuthConfig {
  user?: string;
  password?: string;
  disabled: boolean;
}

export function readAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  return {
    user: env.BASIC_AUTH_USER?.trim() || undefined,
    password: env.BASIC_AUTH_PASSWORD || undefined,
    disabled: env.BASIC_AUTH_DISABLED === "true" || env.BASIC_AUTH_DISABLED === "1",
  };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // Trotzdem vergleichen, damit die Laufzeit nicht von der Länge abhängt.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export type AuthResult = { ok: true } | { ok: false; status: 401 | 503; message: string };

/** Prüft einen Authorization-Header gegen die Konfiguration. */
export function checkBasicAuth(header: string | null, config: AuthConfig): AuthResult {
  if (config.disabled) return { ok: true };
  if (!config.user || !config.password) {
    return {
      ok: false,
      status: 503,
      message: "Basic Auth ist nicht konfiguriert. Bitte BASIC_AUTH_USER und BASIC_AUTH_PASSWORD setzen (oder für lokale Entwicklung BASIC_AUTH_DISABLED=true).",
    };
  }
  if (!header || !header.startsWith("Basic ")) {
    return { ok: false, status: 401, message: "Anmeldung erforderlich." };
  }
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return { ok: false, status: 401, message: "Ungültiger Authorization-Header." };
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return { ok: false, status: 401, message: "Ungültiger Authorization-Header." };
  const user = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  const userOk = safeEqual(user, config.user);
  const passOk = safeEqual(password, config.password);
  if (!(userOk && passOk)) return { ok: false, status: 401, message: "Benutzername oder Passwort falsch." };
  return { ok: true };
}

export const WWW_AUTHENTICATE = 'Basic realm="KI-Text-Analyzer", charset="UTF-8"';

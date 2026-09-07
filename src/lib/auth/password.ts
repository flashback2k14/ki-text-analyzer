import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const SCRYPT_PARAMS = { N: 1 << 15, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

function scryptAsync(password: string, salt: Buffer, params: { N: number; r: number; p: number; keylen: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p, maxmem: SCRYPT_PARAMS.maxmem }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/** Vergleicht zwei Werte in konstanter Zeit, auch bei unterschiedlicher Länge. */
export function safeEqual(a: Buffer | string, b: Buffer | string): boolean {
  const ba = typeof a === "string" ? Buffer.from(a, "utf8") : a;
  const bb = typeof b === "string" ? Buffer.from(b, "utf8") : b;
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** Liefert "scrypt$N$r$p$salt$hash" (Salt und Hash Base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (salt.length === 0 || expected.length === 0) return false;
  try {
    const key = await scryptAsync(password, salt, { N, r, p, keylen: expected.length });
    return safeEqual(key, expected);
  } catch {
    return false;
  }
}

/** Hash eines Zufallswerts; wird bei unbekannter E-Mail geprüft, damit die Laufzeit nicht verrät, ob das Konto existiert. */
export const DUMMY_HASH: Promise<string> = hashPassword(randomBytes(24).toString("base64"));

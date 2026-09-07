import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getAppSecret } from "../env";

const VERSION = 0x01;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** AES-256-GCM. Ergebnis: Versionsbyte | IV (12) | Auth-Tag (16) | Ciphertext. */
export function encryptSecret(plain: string, key: Buffer = getAppSecret()): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, ciphertext]);
}

/** Wirft, wenn Version, Schlüssel oder Auth-Tag nicht passen. */
export function decryptSecret(blob: Uint8Array, key: Buffer = getAppSecret()): string {
  const buf = Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
  if (buf.length < 1 + IV_LENGTH + TAG_LENGTH) throw new Error("Verschlüsselter Wert ist zu kurz.");
  if (buf[0] !== VERSION) throw new Error(`Unbekannte Verschlüsselungsversion ${buf[0]}.`);
  const iv = buf.subarray(1, 1 + IV_LENGTH);
  const tag = buf.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(1 + IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Kurzform zum Anzeigen, z. B. "sk-ant-…x7Qz". */
export function keyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 11) return "…";
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`;
}

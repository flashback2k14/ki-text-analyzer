import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, keyHint } from "@/lib/auth/crypto";
import { getAppSecret } from "@/lib/env";

const key = randomBytes(32);

describe("encryptSecret / decryptSecret", () => {
  it("ver- und entschlüsselt", () => {
    const blob = encryptSecret("sk-ant-api03-geheim", key);
    expect(blob[0]).toBe(1);
    expect(decryptSecret(blob, key)).toBe("sk-ant-api03-geheim");
  });
  it("erzeugt unterschiedliche Ciphertexte (IV)", () => {
    expect(encryptSecret("x", key).equals(encryptSecret("x", key))).toBe(false);
  });
  it("wirft bei falschem Schlüssel", () => {
    const blob = encryptSecret("x", key);
    expect(() => decryptSecret(blob, randomBytes(32))).toThrow();
  });
  it("wirft bei manipuliertem Ciphertext", () => {
    const blob = encryptSecret("sk-ant-etwas-laengeres", key);
    blob[blob.length - 1] ^= 0xff;
    expect(() => decryptSecret(blob, key)).toThrow();
  });
  it("akzeptiert Uint8Array mit Offset", () => {
    const blob = encryptSecret("x", key);
    const padded = Buffer.concat([Buffer.from([9, 9]), blob]);
    const view = new Uint8Array(padded.buffer, padded.byteOffset + 2, blob.length);
    expect(decryptSecret(view, key)).toBe("x");
  });
});

describe("keyHint", () => {
  it("zeigt nur Anfang und Ende", () => {
    expect(keyHint("sk-ant-api03-abcdefghijklmnop")).toBe("sk-ant-…mnop");
    expect(keyHint("kurz")).toBe("…");
  });
});

describe("getAppSecret", () => {
  it("wirft ohne oder mit zu kurzem Secret", () => {
    expect(() => getAppSecret({})).toThrow(/APP_SECRET fehlt/);
    expect(() => getAppSecret({ APP_SECRET: "kurz" })).toThrow(/zu kurz/);
  });
  it("akzeptiert Strings ab 32 Zeichen und liefert 32 Byte", () => {
    expect(getAppSecret({ APP_SECRET: randomBytes(32).toString("base64") }).length).toBe(32);
    expect(getAppSecret({ APP_SECRET: "a".repeat(32) }).length).toBe(32);
    expect(() => getAppSecret({ APP_SECRET: "a".repeat(31) })).toThrow(/zu kurz/);
  });
});

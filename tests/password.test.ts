import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, safeEqual, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("erkennt das richtige Passwort und lehnt falsche ab", async () => {
    const hash = await hashPassword("ge:heim-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("ge:heim-123", hash)).toBe(true);
    expect(await verifyPassword("ge:heim-124", hash)).toBe(false);
  });
  it("erzeugt für dasselbe Passwort verschiedene Hashes (Salt)", async () => {
    expect(await hashPassword("abc12345")).not.toBe(await hashPassword("abc12345"));
  });
  it("lehnt kaputte Hash-Strings ab statt zu werfen", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$4$5")).toBe(false);
    expect(await verifyPassword("x", "scrypt$abc$8$1$c2FsdA==$aGFzaA==")).toBe(false);
  });
  it("stellt einen Dummy-Hash bereit", async () => {
    expect(await verifyPassword("irgendwas", await DUMMY_HASH)).toBe(false);
  });
});

describe("safeEqual", () => {
  it("vergleicht Strings und Buffer", () => {
    expect(safeEqual("a", "a")).toBe(true);
    expect(safeEqual("a", "b")).toBe(false);
    expect(safeEqual("a", "ab")).toBe(false);
    expect(safeEqual(Buffer.from("xy"), Buffer.from("xy"))).toBe(true);
  });
});

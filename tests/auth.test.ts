import { describe, expect, it } from "vitest";
import { checkBasicAuth, readAuthConfig } from "@/lib/auth";

const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
const config = { user: "admin", password: "ge:heim", disabled: false };

describe("checkBasicAuth", () => {
  it("verlangt Anmeldung ohne Header", () => {
    expect(checkBasicAuth(null, config)).toMatchObject({ ok: false, status: 401 });
  });
  it("lehnt falsches Passwort und falschen Nutzer ab", () => {
    expect(checkBasicAuth(basic("admin", "falsch"), config)).toMatchObject({ ok: false, status: 401 });
    expect(checkBasicAuth(basic("root", "ge:heim"), config)).toMatchObject({ ok: false, status: 401 });
  });
  it("akzeptiert korrekte Daten, auch mit Doppelpunkt im Passwort", () => {
    expect(checkBasicAuth(basic("admin", "ge:heim"), config)).toEqual({ ok: true });
  });
  it("antwortet 503, wenn keine Zugangsdaten konfiguriert sind", () => {
    expect(checkBasicAuth(basic("admin", "x"), { disabled: false })).toMatchObject({ ok: false, status: 503 });
  });
  it("lässt alles durch, wenn Basic Auth ausdrücklich abgeschaltet ist", () => {
    expect(checkBasicAuth(null, { disabled: true })).toEqual({ ok: true });
  });
  it("liest die Konfiguration aus der Umgebung", () => {
    expect(readAuthConfig({ BASIC_AUTH_USER: " u ", BASIC_AUTH_PASSWORD: "p", BASIC_AUTH_DISABLED: "false" })).toEqual({ user: "u", password: "p", disabled: false });
    expect(readAuthConfig({ BASIC_AUTH_DISABLED: "true" })).toEqual({ user: undefined, password: undefined, disabled: true });
  });
});

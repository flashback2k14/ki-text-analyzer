import { describe, expect, it } from "vitest";
import { ApiKeySchema, fieldErrorsOf, LoginSchema, ModelSchema, RegisterSchema } from "@/lib/auth/schemas";
import { checkInviteCode, isRegistrationOpen } from "@/lib/auth/registration";
import { resolveModel } from "@/lib/llm/models";

describe("Schemas", () => {
  it("validiert Login", () => {
    expect(LoginSchema.safeParse({ email: "a@b.de", password: "x" }).success).toBe(true);
    const bad = LoginSchema.safeParse({ email: "keine-mail", password: "" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(Object.keys(fieldErrorsOf(bad.error)).sort()).toEqual(["email", "password"]);
  });
  it("validiert Registrierung inkl. Passwort-Wiederholung", () => {
    const bad = RegisterSchema.safeParse({ email: "a@b.de", password: "12345678", passwordRepeat: "87654321", inviteCode: "c" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrorsOf(bad.error).passwordRepeat).toEqual(["Die Passwörter stimmen nicht überein."]);
    expect(RegisterSchema.safeParse({ email: "a@b.de", password: "1234567", passwordRepeat: "1234567", inviteCode: "c" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ email: "a@b.de", password: "12345678", passwordRepeat: "12345678", inviteCode: "c" }).success).toBe(true);
  });
  it("validiert API-Keys", () => {
    expect(ApiKeySchema.safeParse({ apiKey: "abc" }).success).toBe(false);
    expect(ApiKeySchema.safeParse({ apiKey: "sk-openai-abcdefghijklmnopqrstuvwxyz" }).success).toBe(false);
    expect(ApiKeySchema.safeParse({ apiKey: "  sk-ant-api03-abcdefghijklmnopqrstuvwxyz  " })).toMatchObject({ success: true, data: { apiKey: "sk-ant-api03-abcdefghijklmnopqrstuvwxyz" } });
  });
  it("validiert Modell-IDs, leer bedeutet Server-Vorgabe", () => {
    expect(ModelSchema.safeParse({ model: "" }).success).toBe(true);
    expect(ModelSchema.safeParse({ model: "claude-sonnet-5" }).success).toBe(true);
    expect(ModelSchema.safeParse({ model: "gpt-4" }).success).toBe(false);
    expect(ModelSchema.safeParse({ model: "claude-Sonnet 5" }).success).toBe(false);
  });
});

describe("resolveModel", () => {
  it("nimmt User-Wert, sonst Env, sonst Standard", () => {
    expect(resolveModel("claude-haiku-4-5", { ANTHROPIC_MODEL: "claude-sonnet-5" })).toBe("claude-haiku-4-5");
    expect(resolveModel(null, { ANTHROPIC_MODEL: " claude-sonnet-5 " })).toBe("claude-sonnet-5");
    expect(resolveModel("  ", {})).toBe("claude-opus-5");
  });
});

describe("Einladungscode", () => {
  it("ist ohne Env geschlossen", () => {
    expect(isRegistrationOpen({})).toBe(false);
    expect(isRegistrationOpen({ REGISTRATION_CODE: "  " })).toBe(false);
    expect(checkInviteCode("x", {})).toBe(false);
  });
  it("prüft den Code", () => {
    const env = { REGISTRATION_CODE: "geheim" };
    expect(checkInviteCode(" geheim ", env)).toBe(true);
    expect(checkInviteCode("falsch", env)).toBe(false);
  });
});

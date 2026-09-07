import { describe, expect, it } from "vitest";
import { clearApiKey, createUser, findUserByEmail, findUserById, getEncryptedApiKey, setApiKey, setModel, UserExistsError } from "@/lib/auth/users";
import { openDatabase } from "@/lib/db";

describe("users", () => {
  it("legt User an und findet ihn case-insensitiv", () => {
    const db = openDatabase(":memory:");
    const user = createUser(db, "  Max@Example.COM ", "hash");
    expect(user.email).toBe("max@example.com");
    expect(findUserByEmail(db, "MAX@example.com")?.id).toBe(user.id);
    expect(findUserById(db, user.id)).toMatchObject({ email: "max@example.com", apiKeyHint: null, model: null });
    expect((findUserById(db, user.id) as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });
  it("lehnt doppelte E-Mail ab", () => {
    const db = openDatabase(":memory:");
    createUser(db, "a@b.de", "h");
    expect(() => createUser(db, "A@B.DE", "h")).toThrow(UserExistsError);
  });
  it("speichert, liest und löscht den verschlüsselten Key", () => {
    const db = openDatabase(":memory:");
    const user = createUser(db, "a@b.de", "h");
    setApiKey(db, user.id, Buffer.from([1, 2, 3]), "sk-ant-…abcd", 1000);
    expect(Buffer.from(getEncryptedApiKey(db, user.id)!)).toEqual(Buffer.from([1, 2, 3]));
    expect(findUserById(db, user.id)).toMatchObject({ apiKeyHint: "sk-ant-…abcd", apiKeyUpdatedAt: 1000 });
    clearApiKey(db, user.id);
    expect(getEncryptedApiKey(db, user.id)).toBeNull();
    expect(findUserById(db, user.id)?.apiKeyHint).toBeNull();
  });
  it("speichert das Modell und setzt es wieder zurück", () => {
    const db = openDatabase(":memory:");
    const user = createUser(db, "a@b.de", "h");
    setModel(db, user.id, "claude-sonnet-5");
    expect(findUserById(db, user.id)?.model).toBe("claude-sonnet-5");
    setModel(db, user.id, null);
    expect(findUserById(db, user.id)?.model).toBeNull();
  });
  it("legt das Schema idempotent an", () => {
    const db = openDatabase(":memory:");
    const version = db.prepare("SELECT version FROM schema_version").get() as { version: number };
    expect(version.version).toBe(1);
  });
});

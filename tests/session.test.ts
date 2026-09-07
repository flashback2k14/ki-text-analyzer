import { describe, expect, it } from "vitest";
import { SESSION_TTL_MS } from "@/lib/auth/constants";
import { createSession, deleteExpiredSessions, deleteSession, deleteSessionsForUser, findSessionUser, hashToken } from "@/lib/auth/session";
import { createUser } from "@/lib/auth/users";
import { openDatabase } from "@/lib/db";

function setup() {
  const db = openDatabase(":memory:");
  const user = createUser(db, "a@b.de", "h");
  return { db, user };
}

describe("sessions", () => {
  it("erzeugt eine Session und findet den User", () => {
    const { db, user } = setup();
    const { token, expiresAt } = createSession(db, user.id, 1_000);
    expect(expiresAt).toBe(1_000 + SESSION_TTL_MS);
    expect(findSessionUser(db, token, 2_000)).toMatchObject({ id: user.id, email: "a@b.de" });
    const stored = db.prepare("SELECT id FROM sessions").get() as { id: string };
    expect(stored.id).toBe(hashToken(token));
    expect(stored.id).not.toContain(token);
  });
  it("liefert null bei unbekanntem Token", () => {
    const { db } = setup();
    expect(findSessionUser(db, "gibt-es-nicht")).toBeNull();
  });
  it("löscht abgelaufene Sessions beim Lesen", () => {
    const { db, user } = setup();
    const { token } = createSession(db, user.id, 1_000);
    expect(findSessionUser(db, token, 1_000 + SESSION_TTL_MS)).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });
  it("löscht einzelne, alle und abgelaufene Sessions", () => {
    const { db, user } = setup();
    const a = createSession(db, user.id, 1_000);
    const b = createSession(db, user.id, 1_000);
    deleteSession(db, a.token);
    expect(findSessionUser(db, a.token, 2_000)).toBeNull();
    expect(findSessionUser(db, b.token, 2_000)).not.toBeNull();
    deleteSessionsForUser(db, user.id);
    expect(findSessionUser(db, b.token, 2_000)).toBeNull();
    createSession(db, user.id, 1_000);
    expect(deleteExpiredSessions(db, 1_000 + SESSION_TTL_MS + 1)).toBe(1);
  });
  it("entfernt Sessions, wenn der User gelöscht wird", () => {
    const { db, user } = setup();
    createSession(db, user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });
});

// Nur serverseitig verwenden; nie aus Client-Komponenten importieren.
import { cache } from "react";
import { getDb } from "../db";
import { readSessionToken } from "./cookies";
import { decryptSecret } from "./crypto";
import { findSessionUser } from "./session";
import { getEncryptedApiKey, type User } from "./users";

export class UnauthorizedError extends Error {
  constructor() {
    super("Anmeldung erforderlich.");
    this.name = "UnauthorizedError";
  }
}

/** Prüft die Session gegen die Datenbank; pro Request memoisiert. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  return findSessionUser(getDb(), token);
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Anmeldung erforderlich.", reason: "unauthenticated" }, { status: 401 });
}

export type ApiKeyState = { status: "none" } | { status: "ok"; key: string } | { status: "undecryptable" };

/** Entschlüsselt den hinterlegten Key. Bei gewechseltem APP_SECRET ist der Wert nicht mehr lesbar. */
export function readUserApiKey(userId: string): ApiKeyState {
  const enc = getEncryptedApiKey(getDb(), userId);
  if (!enc) return { status: "none" };
  try {
    return { status: "ok", key: decryptSecret(enc) };
  } catch (err) {
    console.error(`[ki-text-analyzer] API-Key von User ${userId} kann nicht entschlüsselt werden (APP_SECRET geändert?):`, err);
    return { status: "undecryptable" };
  }
}

export function getUserApiKey(userId: string): string | null {
  const state = readUserApiKey(userId);
  return state.status === "ok" ? state.key : null;
}

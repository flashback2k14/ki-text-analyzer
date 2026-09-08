"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setSessionCookie } from "@/lib/auth/cookies";
import { encryptSecret, keyHint } from "@/lib/auth/crypto";
import { getCurrentUser, readUserApiKey } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ApiKeySchema, ChangePasswordSchema, fieldErrorsOf, formString, ModelSchema, type FormState } from "@/lib/auth/schemas";
import { createSession, deleteSessionsForUser } from "@/lib/auth/session";
import { clearApiKey, findUserWithHashById, setApiKey, setModel, updatePasswordHash, type User } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { hasEnvCredentials, resolveModel, toLlmError } from "@/lib/llm/client";

async function userOrRedirect(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden?next=/konto");
  return user;
}

export async function saveApiKey(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const parsed = ApiKeySchema.safeParse({ apiKey: formString(formData, "apiKey") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    setApiKey(getDb(), user.id, encryptSecret(parsed.data.apiKey), keyHint(parsed.data.apiKey));
  } catch (err) {
    console.error("[ki-text-analyzer] API-Key konnte nicht gespeichert werden:", err);
    return { message: "Der Key konnte nicht gespeichert werden." };
  }
  revalidatePath("/konto");
  return { ok: true, message: "Der API-Key wurde gespeichert." };
}

export async function deleteApiKey(): Promise<FormState> {
  const user = await userOrRedirect();
  clearApiKey(getDb(), user.id);
  revalidatePath("/konto");
  return { ok: true, message: "Der API-Key wurde gelöscht." };
}

export async function testApiKey(): Promise<FormState> {
  const user = await userOrRedirect();
  const state = readUserApiKey(user.id);
  if (state.status === "undecryptable") return { message: "Der gespeicherte Key kann nicht entschlüsselt werden. Bitte neu speichern." };
  const apiKey = state.status === "ok" ? state.key : null;
  if (!apiKey && !hasEnvCredentials()) return { message: "Es ist kein API-Key hinterlegt." };

  const model = resolveModel(user.model);
  const client = new Anthropic({ ...(apiKey ? { apiKey } : {}), maxRetries: 0, timeout: 15_000 });
  try {
    const info = await client.models.retrieve(model);
    const source = apiKey ? "Dein Key" : "Der serverweite Key";
    return { ok: true, message: `${source} funktioniert. Modell „${info.display_name}“ (${info.id}) ist erreichbar.` };
  } catch (err) {
    return { message: toLlmError(err, model).message };
  }
}

export async function saveModel(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const choice = formString(formData, "modelChoice");
  const raw = choice === "custom" ? formString(formData, "customModel") : choice;
  const parsed = ModelSchema.safeParse({ model: raw });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: { customModel: raw } };
  setModel(getDb(), user.id, parsed.data.model || null);
  revalidatePath("/konto");
  return { ok: true, message: parsed.data.model ? `Modell „${parsed.data.model}“ gespeichert.` : "Es gilt wieder die Server-Vorgabe." };
}

export async function changePassword(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formString(formData, "currentPassword"),
    password: formString(formData, "password"),
    passwordRepeat: formString(formData, "passwordRepeat"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const db = getDb();
  const stored = findUserWithHashById(db, user.id);
  if (!stored || !(await verifyPassword(parsed.data.currentPassword, stored.passwordHash))) {
    return { fieldErrors: { currentPassword: ["Das aktuelle Passwort ist falsch."] } };
  }
  updatePasswordHash(db, user.id, await hashPassword(parsed.data.password));
  // Alle anderen Sitzungen beenden, diese hier neu ausstellen.
  deleteSessionsForUser(db, user.id);
  const session = createSession(db, user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return { ok: true, message: "Das Passwort wurde geändert. Andere Sitzungen wurden abgemeldet." };
}

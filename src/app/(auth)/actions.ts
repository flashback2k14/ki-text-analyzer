"use server";

import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/auth/cookies";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/paths";
import { checkInviteCode, isRegistrationOpen } from "@/lib/auth/registration";
import { fieldErrorsOf, formString, LoginSchema, RegisterSchema, type FormState } from "@/lib/auth/schemas";
import { createSession } from "@/lib/auth/session";
import { createUser, findUserByEmail, UserExistsError } from "@/lib/auth/users";
import { getDb } from "@/lib/db";

const LOGIN_FAILED = "E-Mail oder Passwort falsch.";

export async function login(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const values = { email: formString(formData, "email") };
  const parsed = LoginSchema.safeParse({ email: formString(formData, "email"), password: formString(formData, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  let ok = false;
  let userId: string | null = null;
  try {
    const user = findUserByEmail(getDb(), parsed.data.email);
    // Auch bei unbekannter E-Mail einen Hash prüfen, damit die Antwortzeit nichts verrät.
    ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await DUMMY_HASH));
    userId = user && ok ? user.id : null;
  } catch (err) {
    console.error("[ki-text-analyzer] Anmeldung fehlgeschlagen:", err);
    return { message: "Die Anmeldung ist wegen eines Serverfehlers fehlgeschlagen.", values };
  }
  if (!userId) return { message: LOGIN_FAILED, values };

  const session = createSession(getDb(), userId);
  await setSessionCookie(session.token, session.expiresAt);
  redirect(safeNextPath(formString(formData, "next")));
}

export async function register(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const values = { email: formString(formData, "email") };
  if (!isRegistrationOpen()) return { message: "Die Registrierung ist auf dieser Instanz nicht freigeschaltet.", values };

  const parsed = RegisterSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
    passwordRepeat: formString(formData, "passwordRepeat"),
    inviteCode: formString(formData, "inviteCode"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  if (!checkInviteCode(parsed.data.inviteCode)) {
    return { fieldErrors: { inviteCode: ["Der Einladungscode ist falsch."] }, values };
  }

  let userId: string;
  try {
    const hash = await hashPassword(parsed.data.password);
    userId = createUser(getDb(), parsed.data.email, hash).id;
  } catch (err) {
    if (err instanceof UserExistsError) return { fieldErrors: { email: [err.message] }, values };
    console.error("[ki-text-analyzer] Registrierung fehlgeschlagen:", err);
    return { message: "Die Registrierung ist wegen eines Serverfehlers fehlgeschlagen.", values };
  }

  const session = createSession(getDb(), userId);
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/");
}

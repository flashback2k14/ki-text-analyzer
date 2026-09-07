"use client";

import { useActionState } from "react";
import { FormAlert, FormField, primaryButton } from "@/components/FormField";
import type { FormState } from "@/lib/auth/schemas";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(changePassword, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <FormField label="Aktuelles Passwort" name="currentPassword" type="password" autoComplete="current-password" required errors={state?.fieldErrors?.currentPassword} />
      <FormField label="Neues Passwort" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Mindestens 8 Zeichen." errors={state?.fieldErrors?.password} />
      <FormField label="Neues Passwort wiederholen" name="passwordRepeat" type="password" autoComplete="new-password" required errors={state?.fieldErrors?.passwordRepeat} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Speichern …" : "Passwort ändern"}
      </button>
      {state?.message && <FormAlert message={state.message} tone={state.ok ? "success" : "error"} />}
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert, FormField, primaryButton } from "@/components/FormField";
import type { FormState } from "@/lib/auth/schemas";
import { register } from "./actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormField label="E-Mail" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} errors={state?.fieldErrors?.email} />
      <FormField label="Passwort" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Mindestens 8 Zeichen." errors={state?.fieldErrors?.password} />
      <FormField label="Passwort wiederholen" name="passwordRepeat" type="password" autoComplete="new-password" required errors={state?.fieldErrors?.passwordRepeat} />
      <FormField label="Einladungscode" name="inviteCode" type="text" autoComplete="off" required errors={state?.fieldErrors?.inviteCode} />
      {state?.message && <FormAlert message={state.message} />}
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Konto wird angelegt …" : "Konto anlegen"}
      </button>
      <p className="text-center text-sm text-muted">
        Schon ein Konto?{" "}
        <Link href="/anmelden" className="text-accent hover:underline">
          Anmelden
        </Link>
      </p>
    </form>
  );
}

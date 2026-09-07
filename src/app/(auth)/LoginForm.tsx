"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert, FormField, primaryButton } from "@/components/FormField";
import type { FormState } from "@/lib/auth/schemas";
import { login } from "./actions";

interface Props {
  next: string;
  registrationOpen: boolean;
}

export function LoginForm({ next, registrationOpen }: Props) {
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormField label="E-Mail" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} errors={state?.fieldErrors?.email} />
      <FormField label="Passwort" name="password" type="password" autoComplete="current-password" required errors={state?.fieldErrors?.password} />
      {state?.message && <FormAlert message={state.message} />}
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Anmeldung läuft …" : "Anmelden"}
      </button>
      {registrationOpen && (
        <p className="text-center text-sm text-muted">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="text-accent hover:underline">
            Registrieren
          </Link>
        </p>
      )}
    </form>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { isRegistrationOpen } from "@/lib/auth/registration";
import { RegisterForm } from "../RegisterForm";

export const metadata: Metadata = { title: "Registrieren · KI-Text-Analyzer" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const open = isRegistrationOpen();
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Konto anlegen</h1>
      {open ? (
        <>
          <p className="mb-5 mt-1 text-sm text-muted">Für die Registrierung brauchst du den Einladungscode dieser Instanz.</p>
          <RegisterForm />
        </>
      ) : (
        <>
          <p className="mb-5 mt-1 text-sm text-muted">
            Die Registrierung ist auf dieser Instanz nicht freigeschaltet. Wer die Instanz betreibt, kann sie über die Umgebungsvariable REGISTRATION_CODE öffnen.
          </p>
          <Link href="/anmelden" className="text-sm text-accent hover:underline">
            Zur Anmeldung
          </Link>
        </>
      )}
    </>
  );
}

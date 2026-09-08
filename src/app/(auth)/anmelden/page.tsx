import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/paths";
import { isRegistrationOpen } from "@/lib/auth/registration";
import { LoginForm } from "../LoginForm";

export const metadata: Metadata = { title: "Anmelden · KI-Text-Analyzer" };

export default async function LoginPage(props: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await props.searchParams;
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const user = await getCurrentUser();
  if (user) redirect(next);
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Anmelden</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Mit E-Mail-Adresse und Passwort.</p>
      <LoginForm next={next} registrationOpen={isRegistrationOpen()} />
    </>
  );
}

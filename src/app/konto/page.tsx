import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, readUserApiKey } from "@/lib/auth/dal";
import { resolveModel } from "@/lib/llm/models";
import { hasEnvCredentials } from "@/lib/llm/client";
import { ApiKeyForm } from "./ApiKeyForm";
import { CostsSection } from "./CostsSection";
import { ModelForm } from "./ModelForm";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Konto · KI-Text-Analyzer" };

export default async function KontoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden?next=/konto");

  const keyState = readUserApiKey(user.id).status;
  const serverDefaultModel = resolveModel(null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Konto</h1>
        <p className="mt-1 text-sm text-muted">Angemeldet als {user.email}</p>
      </div>

      <section aria-labelledby="api-key-heading" className="rounded-xl border border-border bg-surface p-5">
        <h2 id="api-key-heading" className="text-lg font-semibold">
          Anthropic-API-Key
        </h2>
        <p className="mt-1 text-sm text-muted">
          Mit eigenem Key laufen die Claude-Funktionen (Alternativen und Gesamteinschätzung) über dein Anthropic-Konto. Der Key wird verschlüsselt gespeichert und nie wieder angezeigt.
          {hasEnvCredentials() && " Ohne eigenen Key wird der serverweite Key dieser Instanz verwendet."}
        </p>
        <ApiKeyForm keyState={keyState} hint={user.apiKeyHint} updatedAt={user.apiKeyUpdatedAt} envKeyAvailable={hasEnvCredentials()} />
      </section>

      <section aria-labelledby="model-heading" className="rounded-xl border border-border bg-surface p-5">
        <h2 id="model-heading" className="text-lg font-semibold">
          KI-Modell
        </h2>
        <p className="mt-1 text-sm text-muted">Welches Claude-Modell die Alternativen und die Einschätzung erzeugt. Ohne Auswahl gilt die Server-Vorgabe. Die Auswahl ist zugleich die Vorbelegung im Dialog vor jedem Claude-Aufruf; dort lässt sich das Modell für einen einzelnen Durchlauf ändern.</p>
        <ModelForm currentModel={user.model} serverDefault={serverDefaultModel} />
      </section>

      <CostsSection userId={user.id} />

      <section aria-labelledby="password-heading" className="rounded-xl border border-border bg-surface p-5">
        <h2 id="password-heading" className="text-lg font-semibold">
          Passwort ändern
        </h2>
        <PasswordForm />
      </section>
    </main>
  );
}

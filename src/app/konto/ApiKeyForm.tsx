"use client";

import { startTransition, useActionState, useState } from "react";
import { FormAlert, FormField, primaryButton, secondaryButton } from "@/components/FormField";
import type { ApiKeyState } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/schemas";
import { deleteApiKey, saveApiKey, testApiKey } from "./actions";

interface Props {
  keyState: ApiKeyState["status"];
  hint: string | null;
  updatedAt: number | null;
  envKeyAvailable: boolean;
}

export function ApiKeyForm({ keyState, hint, updatedAt, envKeyAvailable }: Props) {
  const [saveState, saveAction, saving] = useActionState<FormState | undefined, FormData>(saveApiKey, undefined);
  const [testState, testAction, testing] = useActionState<FormState | undefined, void>(testApiKey, undefined);
  const [deleteState, deleteAction, deleting] = useActionState<FormState | undefined, void>(deleteApiKey, undefined);
  const [last, setLast] = useState<"save" | "test" | "delete" | null>(null);

  const hasKey = keyState !== "none";
  const status =
    keyState === "ok" && hint
      ? `Gespeicherter Key: ${hint}${updatedAt ? `, zuletzt geändert am ${new Date(updatedAt).toLocaleString("de-DE")}` : ""}`
      : keyState === "undecryptable"
        ? "Der gespeicherte Key kann nicht mehr entschlüsselt werden (APP_SECRET geändert?). Bitte neu speichern."
        : envKeyAvailable
          ? "Kein eigener Key hinterlegt. Es wird der serverweite Key verwendet."
          : "Kein Key hinterlegt. Claude-Funktionen sind deaktiviert.";

  const feedback = last === "save" ? saveState : last === "test" ? testState : last === "delete" ? deleteState : undefined;

  return (
    <div className="mt-4 space-y-4">
      <p className={`text-sm ${keyState === "undecryptable" ? "text-red-700 dark:text-red-300" : ""}`}>{status}</p>

      <form action={saveAction} onSubmit={() => setLast("save")} className="space-y-3">
        <FormField
          label={hasKey ? "Neuen Key speichern" : "Key speichern"}
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-…"
          required
          errors={saveState?.fieldErrors?.apiKey}
          hint="Zu finden in der Anthropic Console unter „API Keys“."
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Speichern …" : "Key speichern"}
          </button>
          <button type="button" disabled={testing || (!hasKey && !envKeyAvailable)} onClick={() => {
              setLast("test");
              startTransition(() => testAction());
            }} className={secondaryButton}>
            {testing ? "Prüfung läuft …" : "Key testen"}
          </button>
          {hasKey && (
            <button type="button" disabled={deleting} onClick={() => {
              setLast("delete");
              startTransition(() => deleteAction());
            }} className={secondaryButton}>
              {deleting ? "Löschen …" : "Key löschen"}
            </button>
          )}
        </div>
      </form>

      {feedback?.message && <FormAlert message={feedback.message} tone={feedback.ok ? "success" : "error"} />}
    </div>
  );
}

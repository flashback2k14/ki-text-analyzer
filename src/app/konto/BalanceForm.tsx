"use client";

import { startTransition, useActionState, useState } from "react";
import { FormAlert, FormField, primaryButton, secondaryButton } from "@/components/FormField";
import type { FormState } from "@/lib/auth/schemas";
import { deleteBalance, saveBalance } from "./actions";

const inputClass = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/** Datum/Uhrzeit aus dem Eingabefeld in Browser-Zeit auswerten, damit die Zeitzone des Servers keine Rolle spielt. */
function toTimestamp(local: string): string {
  if (!local) return "";
  const ts = new Date(local).getTime();
  return Number.isFinite(ts) ? String(ts) : "";
}

export function BalanceForm({ hasBalance }: { hasBalance: boolean }) {
  const [saveState, saveAction, saving] = useActionState<FormState | undefined, FormData>(saveBalance, undefined);
  const [deleteState, deleteAction, deleting] = useActionState<FormState | undefined, void>(deleteBalance, undefined);
  const [last, setLast] = useState<"save" | "delete" | null>(null);
  const [asOfLocal, setAsOfLocal] = useState("");

  const feedback = last === "save" ? saveState : last === "delete" ? deleteState : undefined;

  return (
    <div className="mt-3 space-y-3">
      <form action={saveAction} onSubmit={() => setLast("save")} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label="Guthaben laut Anthropic Console (USD)"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="z. B. 25,00"
            required
            defaultValue={saveState?.values?.amount}
            errors={saveState?.fieldErrors?.amount}
            hint="Steht in der Console unter „Billing“."
          />
          <div>
            <label htmlFor="asOfLocal" className="block text-sm font-medium">
              Stand vom
            </label>
            <input id="asOfLocal" type="datetime-local" value={asOfLocal} onChange={(e) => setAsOfLocal(e.target.value)} className={inputClass} />
            <input type="hidden" name="asOf" value={toTimestamp(asOfLocal)} />
            {saveState?.fieldErrors?.asOf ? (
              <p className="mt-1 text-xs text-red-700 dark:text-red-300">{saveState.fieldErrors.asOf.join(" ")}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Leer lassen, wenn der Betrag gerade abgelesen wurde.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Speichern …" : hasBalance ? "Neuen Stand speichern" : "Guthaben speichern"}
          </button>
          {hasBalance && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setLast("delete");
                startTransition(() => deleteAction());
              }}
              className={secondaryButton}
            >
              {deleting ? "Entfernen …" : "Guthaben entfernen"}
            </button>
          )}
        </div>
      </form>
      {feedback?.message && <FormAlert message={feedback.message} tone={feedback.ok ? "success" : "error"} />}
    </div>
  );
}

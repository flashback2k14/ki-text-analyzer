"use client";

import { useActionState, useState } from "react";
import { FormAlert, primaryButton } from "@/components/FormField";
import type { FormState } from "@/lib/auth/schemas";
import { KNOWN_MODELS } from "@/lib/llm/models";
import { saveModel } from "./actions";

interface Props {
  currentModel: string | null;
  serverDefault: string;
}

const selectClass = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function ModelForm({ currentModel, serverDefault }: Props) {
  const [state, action, pending] = useActionState<FormState | undefined, FormData>(saveModel, undefined);
  const isKnown = currentModel === null || KNOWN_MODELS.some((m) => m.id === currentModel);
  const [choice, setChoice] = useState<string>(currentModel === null ? "" : isKnown ? currentModel : "custom");

  const effective = currentModel ?? serverDefault;

  return (
    <form action={action} className="mt-4 space-y-3">
      <p className="text-sm">
        Aktuell wirksam: <code className="rounded bg-background px-1.5 py-0.5 text-xs">{effective}</code>
        {currentModel === null && <span className="text-muted"> (Server-Vorgabe)</span>}
      </p>
      <div>
        <label htmlFor="modelChoice" className="block text-sm font-medium">
          Modell
        </label>
        <select id="modelChoice" name="modelChoice" value={choice} onChange={(e) => setChoice(e.target.value)} className={selectClass}>
          <option value="">Server-Vorgabe ({serverDefault})</option>
          {KNOWN_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} ({m.id}) – {m.hinweis}
            </option>
          ))}
          <option value="custom">Eigene Modell-ID …</option>
        </select>
      </div>
      {choice === "custom" && (
        <div>
          <label htmlFor="customModel" className="block text-sm font-medium">
            Modell-ID
          </label>
          <input
            id="customModel"
            name="customModel"
            type="text"
            autoComplete="off"
            placeholder="claude-…"
            defaultValue={state?.values?.customModel ?? (!isKnown ? (currentModel ?? "") : "")}
            aria-invalid={state?.fieldErrors?.model ? true : undefined}
            className={`${selectClass} ${state?.fieldErrors?.model ? "border-red-400" : ""}`}
          />
          {state?.fieldErrors?.model && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{state.fieldErrors.model.join(" ")}</p>}
        </div>
      )}
      {choice !== "custom" && state?.fieldErrors?.model && <p className="text-xs text-red-700 dark:text-red-300">{state.fieldErrors.model.join(" ")}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Speichern …" : "Modell speichern"}
      </button>
      {state?.message && <FormAlert message={state.message} tone={state.ok ? "success" : "error"} />}
    </form>
  );
}

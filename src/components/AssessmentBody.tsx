import type { Assessment } from "@/lib/llm/suggest";

/** Text und Listen einer Einschätzung; genutzt in der Zusammenfassung und im Konto. */
export function AssessmentBody({ assessment }: { assessment: Assessment & { truncated: boolean } }) {
  return (
    <>
      <p className="mt-2 leading-relaxed">{assessment.einschaetzung}</p>
      {assessment.auffaelligkeiten.length > 0 && (
        <>
          <p className="mt-3 text-xs uppercase tracking-wide text-muted">Auffälligkeiten</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {assessment.auffaelligkeiten.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </>
      )}
      {assessment.staerken.length > 0 && (
        <>
          <p className="mt-3 text-xs uppercase tracking-wide text-muted">Spricht für menschlichen Ursprung</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {assessment.staerken.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </>
      )}
      {assessment.truncated && <p className="mt-2 text-xs text-muted">Der Text wurde für die Einschätzung auf Anfang, Mitte und Ende gekürzt.</p>}
    </>
  );
}

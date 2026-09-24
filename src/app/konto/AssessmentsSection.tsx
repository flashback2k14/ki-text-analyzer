import { AssessmentBody } from "@/components/AssessmentBody";
import { secondaryButton } from "@/components/FormField";
import { formatDateTime } from "@/lib/costs/format";
import { getDb } from "@/lib/db";
import { listAssessments } from "@/lib/llm/assessments";
import { modelLabel } from "@/lib/llm/models";
import { deleteAssessment } from "./actions";

const ASSESSMENT_LIST_LIMIT = 20;

export function AssessmentsSection({ userId }: { userId: string }) {
  const assessments = listAssessments(getDb(), userId, ASSESSMENT_LIST_LIMIT);

  return (
    <section aria-labelledby="assessments-heading" className="rounded-xl border border-border bg-surface p-5">
      <h2 id="assessments-heading" className="text-lg font-semibold">
        Gespeicherte Einschätzungen
      </h2>
      <p className="mt-1 text-sm text-muted">
        Jede Gesamteinschätzung von Claude wird hier abgelegt und bleibt erhalten, auch wenn die Datei in der Analyse geschlossen wird. Angezeigt werden die letzten {ASSESSMENT_LIST_LIMIT}.
      </p>

      {assessments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Noch keine Einschätzung gespeichert.</p>
      ) : (
        <ul className="mt-4 text-sm">
          {assessments.map((a) => (
            <li key={a.id} className="border-t border-border py-2">
              <details>
                <summary className="cursor-pointer [overflow-wrap:anywhere]">
                  <span className="font-medium">{a.fileName ?? "Ohne Dateiname"}</span>
                  <span className="ml-2 text-xs text-muted">
                    {formatDateTime(a.createdAt)} · {modelLabel(a.model)} · Wahrscheinlichkeit: {a.wahrscheinlichkeit}
                  </span>
                </summary>
                <div className="mt-2 rounded-lg border border-accent/40 bg-accent/5 p-4">
                  <AssessmentBody assessment={a} />
                  <form action={deleteAssessment} className="mt-3">
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className={secondaryButton}>
                      Einschätzung löschen
                    </button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

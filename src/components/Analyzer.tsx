"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, Finding } from "@/lib/analysis/types";
import type { AnalyzeResponse, ApiError, RunUsage, SuggestResponse } from "@/lib/client-types";
import type { Assessment } from "@/lib/llm/suggest";
import { allowPersist, blockPersist, clearStoredSession, loadStoredSession, saveStoredSession, type StoredSession } from "@/lib/session-store";
import { ClaudeDialog } from "./ClaudeDialog";
import { DocumentView } from "./DocumentView";
import { FindingPanel } from "./FindingPanel";
import { SummaryPanel } from "./SummaryPanel";
import { UploadDropzone } from "./UploadDropzone";

type LlmState = "idle" | "loading" | "done" | "error";

async function readError(res: Response, fallback: string, onUnauthorized: () => void): Promise<string> {
  if (res.status === 401) {
    onUnauthorized();
    return "Die Sitzung ist abgelaufen. Bitte erneut anmelden.";
  }
  try {
    const body = (await res.json()) as ApiError;
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export function Analyzer({ userId }: { userId: string }) {
  const router = useRouter();
  const toLogin = useCallback(() => router.push("/anmelden?next=/"), [router]);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [llmState, setLlmState] = useState<LlmState>("idle");
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmModel, setLlmModel] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<(Assessment & { truncated: boolean }) | null>(null);
  const [runUsage, setRunUsage] = useState<RunUsage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  /** true, bis der gespeicherte Stand aus IndexedDB geprüft wurde (verhindert ein kurzes Aufblitzen der Upload-Fläche). */
  const [restoring, setRestoring] = useState(true);
  /** Letzter Stand, damit er beim Verlassen der Seite auch vor Ablauf des Timers geschrieben wird. */
  const pending = useRef<StoredSession | null>(null);

  // Gespeicherten Stand wiederherstellen; Stände anderer User werden verworfen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadStoredSession();
      if (cancelled) return;
      if (stored && stored.userId === userId) {
        setFile(new File([stored.file], stored.fileName, { type: stored.file.type }));
        setResult(stored.result);
        setFindings(stored.findings);
        setAssessment(stored.assessment);
        setLlmModel(stored.llmModel);
        setRunUsage(stored.runUsage);
        setLlmState(stored.llmState);
        setSelectedId(stored.selectedId);
        setHidden(new Set(stored.hidden));
      } else if (stored) {
        void clearStoredSession();
      }
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Jede Änderung am Ergebnis sichern (leicht verzögert, damit schnelle Folgeänderungen zusammenfallen).
  useEffect(() => {
    if (restoring || !file || !result) return;
    const session: StoredSession = {
      userId,
      savedAt: Date.now(),
      file,
      fileName: file.name,
      result,
      findings,
      assessment,
      llmModel,
      runUsage,
      llmState: llmState === "loading" ? "idle" : llmState,
      selectedId,
      hidden: [...hidden],
    };
    pending.current = session;
    const timer = setTimeout(() => {
      pending.current = null;
      void saveStoredSession(session);
    }, 300);
    return () => clearTimeout(timer);
  }, [restoring, userId, file, result, findings, assessment, llmModel, runUsage, llmState, selectedId, hidden]);

  // Beim Verlassen der Seite (Wechsel zum Konto) den noch nicht geschriebenen Stand sichern.
  useEffect(() => {
    return () => {
      if (pending.current) void saveStoredSession(pending.current);
    };
  }, []);

  const analyze = useCallback(async (f: File) => {
    setBusy(true);
    setError(null);
    allowPersist();
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      if (!res.ok) throw new Error(await readError(res, `Analyse fehlgeschlagen (Status ${res.status}).`, toLogin));
      const data = (await res.json()) as AnalyzeResponse;
      setFile(f);
      setResult(data);
      setFindings(data.findings);
      setSelectedId(data.findings[0]?.id ?? null);
      setHidden(new Set());
      setLlmState("idle");
      setLlmError(null);
      setLlmModel(null);
      setAssessment(null);
      setRunUsage(null);
      setDialogOpen(false);
      setExportError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyse fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }, [toLogin]);

  const reset = () => {
    blockPersist();
    pending.current = null;
    void clearStoredSession();
    setFile(null);
    setResult(null);
    setFindings([]);
    setSelectedId(null);
    setHidden(new Set());
    setError(null);
    setLlmState("idle");
    setLlmError(null);
    setLlmModel(null);
    setAssessment(null);
    setRunUsage(null);
    setExportError(null);
  };

  const visibleFindings = useMemo(() => findings.filter((f) => !hidden.has(f.category)), [findings, hidden]);
  const selected = useMemo(() => findings.find((f) => f.id === selectedId) ?? null, [findings, selectedId]);
  const selectedIndex = visibleFindings.findIndex((f) => f.id === selectedId);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    const el = document.getElementById(`finding-${id}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const step = (delta: number) => {
    if (visibleFindings.length === 0) return;
    const next = selectedIndex < 0 ? 0 : (selectedIndex + delta + visibleFindings.length) % visibleFindings.length;
    select(visibleFindings[next].id);
  };

  useEffect(() => {
    if (!result) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const toggleCategory = (c: Category) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const fullText = useMemo(() => (result ? result.paragraphs.map((p) => p.text).filter((t) => t.trim()).join("\n\n") : ""), [result]);
  const suggestChars = useMemo(
    () => (result ? findings.reduce((n, f) => n + (result.paragraphs[f.paragraphIndex]?.text.length ?? 0) + f.message.length + 80, 0) : 0),
    [result, findings],
  );

  const loadSuggestions = async (model: string) => {
    if (!result) return;
    setDialogOpen(false);
    setLlmState("loading");
    setLlmError(null);
    try {
      const body = {
        findings: findings.map((f) => ({
          id: f.id,
          category: f.category,
          ruleName: f.ruleName,
          message: f.message,
          matchedText: f.matchedText,
          paragraphText: result.paragraphs[f.paragraphIndex]?.text ?? "",
        })),
        fullText,
        assess: true,
        model,
        fileName: result.fileName,
      };
      const res = await fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await readError(res, `Anfrage an das Sprachmodell fehlgeschlagen (Status ${res.status}).`, toLogin));
      const data = (await res.json()) as SuggestResponse;
      setFindings((prev) =>
        prev.map((f) => {
          const s = data.suggestions[f.id];
          return s ? { ...f, suggestion: s.alternative, suggestionReason: s.begruendung, suggestionSource: "llm" as const } : f;
        }),
      );
      setAssessment(data.assessment);
      setLlmModel(data.model);
      setRunUsage(data.usage);
      if (data.assessmentError) setLlmError(data.assessmentError);
      setLlmState("done");
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : "Anfrage an das Sprachmodell fehlgeschlagen.");
      setLlmState("error");
    }
  };

  const exportDocx = async () => {
    if (!file || !result) return;
    setExporting(true);
    setExportError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append(
        "findings",
        JSON.stringify(
          findings.map((f) => ({
            paragraphIndex: f.paragraphIndex,
            start: f.start,
            end: f.end,
            category: f.category,
            ruleName: f.ruleName,
            message: f.message,
            matchedText: f.matchedText,
            suggestion: f.suggestion,
            suggestionSource: f.suggestionSource,
            suggestionReason: f.suggestionReason,
          })),
        ),
      );
      form.append(
        "summary",
        JSON.stringify({
          scoreValue: result.score.value,
          scoreLabel: result.score.label,
          reasons: result.score.reasons,
          words: result.stats.words,
          findings: findings.length,
          assessment: assessment ? `${assessment.einschaetzung} (Wahrscheinlichkeit: ${assessment.wahrscheinlichkeit})` : undefined,
        }),
      );
      const res = await fetch("/api/export", { method: "POST", body: form });
      if (!res.ok) throw new Error(await readError(res, `Export fehlgeschlagen (Status ${res.status}).`, toLogin));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.docx$/i, "")}-kommentiert.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export fehlgeschlagen.");
    } finally {
      setExporting(false);
    }
  };

  if (restoring) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12" aria-busy="true">
        <p className="text-sm text-muted">Lade …</p>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight">KI-Text-Analyzer</h1>
          <p className="mt-3 text-muted">
            Lädt ein Word-Dokument (.docx), prüft den deutschen Text auf typische Merkmale KI-generierter Inhalte und markiert die Stellen. Zu jeder Fundstelle gibt es eine Erklärung und eine alternative Formulierung.
          </p>
        </div>
        <UploadDropzone onFile={analyze} busy={busy} error={error} />
        <p className="mt-8 max-w-2xl text-center text-xs text-muted">
          Geprüft werden unter anderem Gedankenstrich-Häufung, Floskeln und Werbesprache, vage Autoritäten, KI-Modewörter, Verbindungswörter am Absatzanfang, Fazit-Bausteine, Inline-Header-Listen, Markdown- und Chatbot-Reste sowie Dialogreste. Grundlage sind die Wikipedia-Kriterien „Anzeichen für KI-generierte Inhalte“. Kein einzelnes Merkmal beweist maschinelle Herkunft; verdächtig ist die Häufung.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6">
      <SummaryPanel
        fileName={result.fileName}
        score={result.score}
        stats={result.stats}
        llmAvailable={result.llmAvailable}
        llmState={llmState}
        llmError={llmError}
        llmModel={llmModel}
        assessment={assessment}
        runUsage={runUsage}
        exporting={exporting}
        exportError={exportError}
        onLoadSuggestions={() => setDialogOpen(true)}
        onExport={exportDocx}
        onReset={reset}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <DocumentView paragraphs={result.paragraphs} findings={findings} hidden={hidden} onToggleCategory={toggleCategory} selectedId={selectedId} onSelect={select} />
        <div className="lg:sticky lg:top-4 lg:self-start">
          <FindingPanel
            finding={selected}
            paragraph={selected ? result.paragraphs[selected.paragraphIndex] : null}
            position={selectedIndex >= 0 ? { index: selectedIndex, total: visibleFindings.length } : null}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            llmState={llmState}
          />
          <p className="mt-2 text-xs text-muted">Tastatur: j / k oder Pfeiltasten wechseln zwischen den Fundstellen.</p>
        </div>
      </div>
      {dialogOpen && (
        <ClaudeDialog
          onClose={() => setDialogOpen(false)}
          onStart={loadSuggestions}
          suggestChars={suggestChars}
          assessChars={fullText.length}
          findingsCount={findings.length}
        />
      )}
    </main>
  );
}

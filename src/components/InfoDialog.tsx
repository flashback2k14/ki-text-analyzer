"use client";

import { useEffect, useRef, useState } from "react";
import { APP_NAME, AUTHOR, LICENSE_NAME, REPO_URL } from "@/lib/about";
import { secondaryButton } from "./FormField";
import { Logo } from "./Logo";

/** Menüpunkt „Info“ im Header; öffnet den Dialog mit Angaben zum Projekt. */
export function InfoButton({ version }: { version: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hover:text-accent" aria-haspopup="dialog">
        Info
      </button>
      {open && <InfoDialog version={version} onClose={() => setOpen(false)} />}
    </>
  );
}

function InfoDialog({ version, onClose }: { version: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="info-dialog-title"
      className="m-auto w-[min(92vw,26rem)] rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <form method="dialog" className="p-5" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <h2 id="info-dialog-title" className="text-lg font-semibold leading-tight">
              {APP_NAME}
            </h2>
            <p className="text-xs text-muted">Version {version}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">Prüft Word-Dokumente auf typische Merkmale KI-generierter Texte, markiert die Fundstellen und schlägt Alternativen vor.</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-muted">Erstellt von</dt>
            <dd>{AUTHOR}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-muted">Quellcode</dt>
            <dd>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-accent underline hover:opacity-80">
                {REPO_URL.replace(/^https:\/\//, "")}
              </a>
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-muted">Lizenz</dt>
            <dd>{LICENSE_NAME}</dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-end">
          <button type="submit" className={secondaryButton}>
            Schließen
          </button>
        </div>
      </form>
    </dialog>
  );
}

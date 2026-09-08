"use client";

import { blockPersist, clearStoredSession } from "@/lib/session-store";
import { secondaryButton } from "./FormField";

/** Abmelden löscht zuerst das im Browser gehaltene Dokument, dann läuft die Server Action. */
export function LogoutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={() => {
        blockPersist();
        void clearStoredSession();
      }}
    >
      <button type="submit" className={secondaryButton}>
        Abmelden
      </button>
    </form>
  );
}

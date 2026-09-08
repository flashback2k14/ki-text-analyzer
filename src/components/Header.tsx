import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { isRegistrationOpen } from "@/lib/auth/registration";
import { secondaryButton } from "./FormField";

/** Zeigt nur an, wer angemeldet ist. Der Zugriffsschutz liegt in den Seiten, Actions und Routen. */
export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="text-sm font-semibold tracking-tight hover:text-accent">
          KI-Text-Analyzer
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden truncate text-muted sm:inline" title={user.email}>
                {user.email}
              </span>
              <Link href="/konto" className="hover:text-accent">
                Konto
              </Link>
              <form action={logout}>
                <button type="submit" className={secondaryButton}>
                  Abmelden
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/anmelden" className="hover:text-accent">
                Anmelden
              </Link>
              {isRegistrationOpen() && (
                <Link href="/registrieren" className="hover:text-accent">
                  Registrieren
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

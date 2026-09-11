import Link from "next/link";
import pkg from "../../package.json";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { isRegistrationOpen } from "@/lib/auth/registration";
import { InfoButton } from "./InfoDialog";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "./Logo";

/** Zeigt nur an, wer angemeldet ist. Der Zugriffsschutz liegt in den Seiten, Actions und Routen. */
export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-tight hover:text-accent">
          <Logo size={22} />
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
              <InfoButton version={pkg.version} />
              <LogoutButton action={logout} />
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
              <InfoButton version={pkg.version} />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

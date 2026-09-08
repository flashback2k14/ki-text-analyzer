// Reine Funktionen ohne Node-Imports, damit Proxy und Tests sie direkt nutzen können.

export type PathKind = "public" | "page" | "api";

/** Login, Registrierung, Healthcheck und die App-Icons (favicon.ico ist schon im Proxy-Matcher ausgenommen). */
export const PUBLIC_PATHS = ["/anmelden", "/registrieren", "/api/health", "/icon.svg", "/apple-icon.png"] as const;

export function classifyPath(pathname: string): PathKind {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (PUBLIC_PATHS.some((p) => clean === p)) return "public";
  if (clean === "/api" || clean.startsWith("/api/")) return "api";
  return "page";
}

/** Erlaubt nur relative Pfade innerhalb der App als Rücksprungziel. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (/[\r\n]/.test(next)) return "/";
  return next;
}

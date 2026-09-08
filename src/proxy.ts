import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { classifyPath } from "@/lib/auth/paths";

/**
 * Optimistische Prüfung: nur ob ein Session-Cookie vorhanden ist. Die echte Prüfung gegen die
 * Datenbank passiert in der Data-Access-Schicht (src/lib/auth/dal.ts) in jeder Seite, Action und Route.
 */
export function proxy(request: NextRequest) {
  const kind = classifyPath(request.nextUrl.pathname);
  if (kind === "public") return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (kind === "api") {
    return NextResponse.json({ error: "Anmeldung erforderlich.", reason: "unauthenticated" }, { status: 401 });
  }
  const url = new URL("/anmelden", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Alles außer statischen Assets; /api/health und die App-Icons werden in classifyPath freigegeben.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};

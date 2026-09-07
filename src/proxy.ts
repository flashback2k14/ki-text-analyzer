import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkBasicAuth, readAuthConfig, WWW_AUTHENTICATE } from "@/lib/auth";

let warned = false;

export function proxy(request: NextRequest) {
  const config = readAuthConfig();
  if (config.disabled && !warned) {
    warned = true;
    console.warn("[ki-text-analyzer] WARNUNG: Basic Auth ist über BASIC_AUTH_DISABLED abgeschaltet. Nur für lokale Entwicklung verwenden.");
  }
  const result = checkBasicAuth(request.headers.get("authorization"), config);
  if (result.ok) return NextResponse.next();

  const headers: Record<string, string> = { "Content-Type": "text/plain; charset=utf-8" };
  if (result.status === 401) headers["WWW-Authenticate"] = WWW_AUTHENTICATE;
  return new NextResponse(result.message, { status: result.status, headers });
}

export const config = {
  // Alles außer statischen Assets und dem Healthcheck.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/health).*)"],
};

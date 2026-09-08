import { describe, expect, it } from "vitest";
import { classifyPath, safeNextPath } from "@/lib/auth/paths";

describe("classifyPath", () => {
  it("gibt Login, Registrierung und Healthcheck frei", () => {
    expect(classifyPath("/anmelden")).toBe("public");
    expect(classifyPath("/registrieren/")).toBe("public");
    expect(classifyPath("/api/health")).toBe("public");
  });
  it("gibt die App-Icons frei", () => {
    expect(classifyPath("/icon.svg")).toBe("public");
    expect(classifyPath("/apple-icon.png")).toBe("public");
    expect(classifyPath("/icon.svg.bak")).toBe("page");
  });
  it("unterscheidet API und Seiten", () => {
    expect(classifyPath("/api/analyze")).toBe("api");
    expect(classifyPath("/api")).toBe("api");
    expect(classifyPath("/")).toBe("page");
    expect(classifyPath("/konto")).toBe("page");
    expect(classifyPath("/anmelden-x")).toBe("page");
  });
});

describe("safeNextPath", () => {
  it("erlaubt nur interne Pfade", () => {
    expect(safeNextPath("/konto?x=1")).toBe("/konto?x=1");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("/a\nb")).toBe("/");
  });
});

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design-Entscheidungen

Für alles Sichtbare gilt der Skill `hallmark` in `.claude/skills/hallmark/`: neue Seiten und
Ansichten, Redesigns, einzelne Komponenten, Farben, Schriften, Abstände, Bewegung. Vor der
ersten Zeile CSS oder JSX die `SKILL.md` lesen und ihrem Ablauf folgen — Pre-flight-Scan,
Genre, Makrostruktur, Theme, Vorschau, Bau, Slop-Test. Die Entscheidungen der bisherigen
Läufe stehen in `.hallmark/log.json`; ein neuer Lauf wählt eine andere Makrostruktur und ein
Theme, das sich auf mindestens einer Achse unterscheidet.

Die Design-Tokens der Landing Page liegen portabel in `tokens.css`, die Seite selbst hält
dieselben Werte auf `.lp` in `src/components/landing/landing.css`.

Deutsche Texte in der Oberfläche und in der Dokumentation folgen dem Skill `vermenschlichen`:
sachlich, ohne Werbesprache, ohne Fazit-Baustein, ohne gehäufte Gedankenstriche. Bei dieser
App ist das keine Stilfrage — sie prüft genau diese Muster.

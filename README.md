# KI-Text-Analyzer

Web-App, die ein Word-Dokument (.docx) entgegennimmt, den deutschen Text auf typische Merkmale KI-generierter Inhalte prüft und die Fundstellen im Text markiert. Zu jeder Fundstelle gibt es eine Erklärung und eine alternative Formulierung. Das Ergebnis lässt sich als docx mit Word-Kommentaren exportieren.

Grundlage der Prüfung sind die Wikipedia-Kriterien [Anzeichen für KI-generierte Inhalte](https://de.wikipedia.org/wiki/Wikipedia:Anzeichen_f%C3%BCr_KI-generierte_Inhalte) und [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing). Kein einzelnes Merkmal beweist maschinelle Herkunft; verdächtig ist die Häufung.

## Funktionsweise

Die Erkennung ist zweistufig:

1. **Regelbasiert, lokal, deterministisch.** Läuft ohne API-Key. Geprüft werden unter anderem:
   - Gedankenstrich-Häufung, Bindestriche in Zahlenspannen
   - aufgeblähte Bedeutung, Werbesprache, redaktionelle Selbstkommentare, vage Autoritäten, Bekanntheit durch Medienpräsenz
   - KI-Modewörter („nahtlos“, „robust“, „eintauchen“, „digitale Landschaft“ …)
   - Verbindungswörter am Absatzanfang (nur bei Häufung), negativer Parallelismus, Kopula-Vermeidung („dient als“), steife Synonyme („verfasste“), Trikolon, angehängte Partizip-Deutungen
   - Fazit- und „Herausforderungen und Ausblick“-Bausteine, englische Titel-Großschreibung in Überschriften
   - Inline-Header-Listen (fettes Schlagwort mit Doppelpunkt), Emojis
   - Markdown-Reste, Chatbot-Zitierreste (`utm_source=chatgpt.com`, `oaicite`, `[cite: …]`), Platzhalter, gemischte Anführungszeichen, abgebrochene Texte
   - Dialog- und Meta-Reste („Ich hoffe, das hilft“, „Stand meines letzten Updates“)

   Daraus entsteht ein Score von 0 bis 100 mit den Stufen „unauffällig“, „auffällig“ und „stark verdächtig“ sowie eine Statistik.

2. **Claude API (optional).** Auf Knopfdruck werden die Fundstellen an die Anthropic API geschickt. Das Modell liefert zu jeder Stelle eine alternative Formulierung mit Begründung sowie eine Gesamteinschätzung des Textes. Der Text verlässt den Server nur, wenn diese Funktion ausgelöst wird.

Der Export erzeugt eine Kopie der Originaldatei, in der jede Fundstelle als Word-Kommentar am betroffenen Text hängt. Am ersten Absatz steht zusätzlich ein Kommentar mit Score und Statistik.

## Lokal starten

Voraussetzung: Node.js 22.

```bash
npm install
cp .env.example .env      # Werte anpassen
npm run dev               # http://localhost:3000
```

Für die lokale Entwicklung kann `BASIC_AUTH_DISABLED=true` gesetzt werden. Ohne Zugangsdaten und ohne diese Variable antwortet die App mit 503, damit eine Instanz nie versehentlich ungeschützt läuft.

Weitere Befehle:

```bash
npm test            # Unit-Tests (vitest)
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run fixtures    # Test-Dokumente unter tests/fixtures neu erzeugen
npm run build && npm start
```

## Mit Docker Compose betreiben

```bash
cp .env.example .env      # BASIC_AUTH_USER, BASIC_AUTH_PASSWORD, ggf. ANTHROPIC_API_KEY eintragen
docker compose up -d --build
```

Die App ist danach unter `http://localhost:3000` erreichbar (Port über `APP_PORT` in `.env` änderbar). Der Container läuft als unprivilegierter Nutzer, hat einen Healthcheck auf `/api/health` und startet nach Neustarts automatisch.

Basic Auth überträgt die Zugangsdaten nur Base64-kodiert. Im Netz gehört deshalb ein Reverse Proxy mit HTTPS davor (Caddy, Traefik, nginx). Das Compose-File enthält bewusst keinen.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `BASIC_AUTH_USER` | ja | Benutzername für den Zugriff |
| `BASIC_AUTH_PASSWORD` | ja | Passwort für den Zugriff |
| `BASIC_AUTH_DISABLED` | nein | `true` schaltet den Schutz ab (nur lokal) |
| `ANTHROPIC_API_KEY` | nein | Ohne Key läuft nur die Regel-Analyse |
| `ANTHROPIC_MODEL` | nein | Standard `claude-opus-5`; z. B. `claude-sonnet-5` für geringere Kosten |
| `APP_PORT` | nein | Veröffentlichter Port bei Docker Compose, Standard 3000 |

## Bedienung

1. docx-Datei in die Upload-Fläche ziehen oder auswählen (maximal 10 MB).
2. Der Text erscheint mit farbigen Markierungen je Kategorie. Kategorien lassen sich über die Legende ein- und ausblenden.
3. Ein Klick auf eine Markierung öffnet das Hinweisfeld mit Erklärung, Originalstelle und alternativer Formulierung. Mit `j`/`k` oder den Pfeiltasten geht es zur nächsten oder vorherigen Fundstelle.
4. „Alternativen mit Claude laden“ ersetzt die festen Regelvorschläge durch Umformulierungen des Sprachmodells und blendet die Gesamteinschätzung ein.
5. „Als docx mit Kommentaren exportieren“ lädt die kommentierte Kopie herunter.

## Grenzen

- Die Regeln erkennen Muster, keine Herkunft. Ein sauber formulierter KI-Text bleibt unauffällig, ein Mensch kann Floskeln schreiben.
- Geprüft wird nur Deutsch. Englische Texte liefern wenige Treffer.
- Text in Kopf- und Fußzeilen, Fußnoten und Textfeldern außerhalb des Hauptteils wird nicht analysiert.
- Kommentare werden an Absätze des Hauptteils gebunden. Trifft ein Offset keinen Textlauf (etwa bei Feldcodes), wird der ganze Absatz kommentiert.

## Projektstruktur

```
src/app/                 Seiten und API-Routen (analyze, suggest, export, health)
src/components/          Upload, Dokumentansicht, Hinweisfeld, Zusammenfassung
src/lib/analysis/        Typen, Regeln (rules/), Analyse, Score
src/lib/docx/            docx-Parser und Kommentar-Export (JSZip, xmldom)
src/lib/llm/             Anthropic-Client, Prompts, Structured Outputs
src/lib/auth.ts          Basic-Auth-Prüfung
src/proxy.ts             Basic Auth für alle Routen außer /api/health
tests/                   vitest-Tests und Fixture-Dokumente
scripts/make-fixtures.ts erzeugt die Fixture-Dokumente
```

## Lizenz

Siehe [LICENSE](LICENSE).

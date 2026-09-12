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

2. **Claude API (optional).** Auf Knopfdruck werden die Fundstellen an die Anthropic API geschickt. Das Modell liefert zu jeder Stelle eine alternative Formulierung mit Begründung sowie eine Gesamteinschätzung des Textes. Der Text verlässt den Server nur, wenn diese Funktion ausgelöst wird. Jeder Nutzer hinterlegt dafür im Konto seinen eigenen API-Key und kann das Modell wählen; alternativ gilt ein serverweiter Key aus der Umgebung.

Der Export erzeugt eine Kopie der Originaldatei, in der jede Fundstelle als Word-Kommentar am betroffenen Text hängt. Am ersten Absatz steht zusätzlich ein Kommentar mit Score und Statistik.

## Kosten

Vor jedem Claude-Aufruf öffnet sich ein Dialog. Er ist mit dem Modell aus den Konto-Einstellungen vorbelegt, erlaubt für diesen Durchlauf ein anderes Modell (auch eine frei eingetragene Modell-ID) und zeigt eine Kostenschätzung aus der Textlänge. Nach dem Aufruf werden die tatsächlichen Token aus der API-Antwort gebucht.

- Gespeichert wird je Durchlauf und Zweck (Alternativen, Einschätzung) in der Tabelle `llm_usage`: Modell, Anzahl der Anfragen, Eingabe-, Ausgabe- und Cache-Token, Kosten in **US-Dollar**, Dateiname.
- Die Preise je 1 Mio. Token liegen in der Tabelle `model_prices`. Beim ersten Start werden die bekannten Claude-Modelle eingetragen (Stand Juni 2026). Ein neues Modell bekommt eine Zeile per SQL, z. B. mit `sqlite3 data/app.db`:
  ```sql
  INSERT INTO model_prices (model, label, input_usd_per_mtok, output_usd_per_mtok, cache_write_usd_per_mtok, cache_read_usd_per_mtok, updated_at)
  VALUES ('claude-beispiel-6', 'Claude Beispiel 6', 4, 20, 5, 0.4, strftime('%s','now') * 1000);
  ```
  Vorhandene Zeilen lassen sich mit `UPDATE` anpassen; die Startwerte überschreiben sie nicht. Für ein Modell ohne Preiszeile werden die Token erfasst, der Betrag bleibt leer.
- Angezeigt wird in **Euro**. Der Kurs ist der EZB-Referenzkurs, den der Server einmal täglich von `ecb.europa.eu` holt und in `exchange_rates` ablegt. Ist der Abruf nicht möglich, gilt der zuletzt gespeicherte Kurs, sonst `USD_EUR_RATE` aus der `.env`, sonst werden die Beträge in USD gezeigt.
- Im Konto stehen die Kosten nach Monat gruppiert, je Monat aufklappbar nach Modell, dazu die letzten Aufrufe.

Die Schätzung im Dialog ist grob: sie rechnet mit etwa 3,5 Zeichen je Token und festen Annahmen für Prompt-Overhead und Antwortlänge und zeigt deshalb eine Spanne.

## Zugang und Konten

Der Analyzer verlangt eine Anmeldung; ohne Sitzung zeigt die Startseite eine Landing Page mit der Funktionsweise. Konten bestehen aus E-Mail-Adresse und Passwort und liegen in einer SQLite-Datenbank (`DATA_DIR/app.db`, ohne zusätzliche Abhängigkeit über das in Node 22 eingebaute `node:sqlite`).

- **Registrierung** ist nur mit dem Einladungscode aus `REGISTRATION_CODE` möglich. Ist die Variable leer, gibt es keine Registrierung; bestehende Konten können sich weiterhin anmelden.
- **Sessions** liegen in der Datenbank; der Browser bekommt nur ein zufälliges Token als httpOnly-Cookie (30 Tage). Abmelden löscht die Session.
- **Passwörter** werden mit scrypt gehasht.
- **API-Keys** werden mit AES-256-GCM verschlüsselt gespeichert; der Schlüssel wird aus `APP_SECRET` abgeleitet. Wird `APP_SECRET` geändert, sind alle gespeicherten Keys unlesbar und müssen neu eingetragen werden. Die Konto-Seite zeigt das an.
- `/api/health` ist ohne Anmeldung erreichbar (Docker-Healthcheck).
- **Die Startseite `/`** ist öffentlich. Ohne Sitzung steht dort die Landing Page (`src/components/landing/`), mit Sitzung direkt der Analyzer. Gestaltet ist sie nach dem Skill [Hallmark](https://github.com/nutlope/hallmark), der als Projekt-Skill unter `.claude/skills/hallmark/` mitliegt und für alle weiteren Design-Entscheidungen gilt (siehe `AGENTS.md`). Die Entwurfsentscheidungen der bisherigen Läufe stehen in `.hallmark/`, die Design-Tokens portabel in `tokens.css`.

Im Konto kann jeder Nutzer seinen Anthropic-API-Key speichern, testen und löschen, das Claude-Modell wählen und das Passwort ändern. Ohne eigenen Key greift `ANTHROPIC_API_KEY` aus der Umgebung, ohne Modellwahl `ANTHROPIC_MODEL`.

## Lokal starten

Voraussetzung: Node.js 22 (ab 22.13, wegen `node:sqlite`).

```bash
npm install
cp .env.example .env      # APP_SECRET und REGISTRATION_CODE eintragen
npm run dev               # http://localhost:3000
```

`APP_SECRET` erzeugst du mit `openssl rand -base64 32`. Ohne die Variable startet der Server nicht. Beim Start meldet Node eine `ExperimentalWarning` für SQLite; das ist erwartbar und hat keine Auswirkung.

Danach unter `/registrieren` mit dem Einladungscode ein Konto anlegen.

Weitere Befehle:

```bash
npm test            # Unit-Tests (vitest)
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run fixtures    # Test-Dokumente unter tests/fixtures neu erzeugen
npm run icons       # Favicon, ICO und Apple-Icon aus src/lib/logo.ts neu erzeugen
npm run build && npm start
```

ESLint läuft in Version 10. Weil `eslint-config-next` noch Plugins bündelt, die nur ESLint 9 als Peer angeben, meldet `npm install` dafür Peer-Warnungen; die Konfiguration gleicht das über `@eslint/compat` aus. Die Warnungen verschwinden, sobald Next die Plugins aktualisiert.

## Mit Docker Compose betreiben

```bash
cp .env.example .env      # APP_SECRET, REGISTRATION_CODE, ggf. ANTHROPIC_API_KEY eintragen
docker compose up -d --build
```

Das Compose-File liest keine `.env`-Datei ein, sondern setzt die Variablen per Interpolation (`${APP_SECRET}` usw.). Lokal nimmt `docker compose` die Werte automatisch aus der `.env` im Projektverzeichnis. Fehlt `APP_SECRET`, bricht Compose mit einer klaren Meldung ab.

Die App ist danach unter `http://localhost:3000` erreichbar (Port über `APP_PORT` in `.env` änderbar). Der Container läuft als unprivilegierter Nutzer, hat einen Healthcheck auf `/api/health` und startet nach Neustarts automatisch. Die Datenbank liegt im benannten Volume `app-data` unter `/app/data` und übersteht Neubauten des Images.

Im Netz gehört ein Reverse Proxy mit HTTPS davor (Caddy, Traefik, nginx). Das Compose-File enthält bewusst keinen. Im Produktionsmodus wird das Session-Cookie nur über HTTPS gesetzt; für einen Betrieb ohne TLS im eigenen LAN lässt sich das mit `SESSION_COOKIE_INSECURE=true` abschalten.

### Mit Portainer

Stack aus dem Git-Repository anlegen (Compose-Pfad `compose.yaml`). Eine `.env`-Datei gibt es im Stack-Verzeichnis nicht; die Werte trägst du unter „Environment variables“ des Stacks ein: mindestens `APP_SECRET`, bei Bedarf `REGISTRATION_CODE`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `USD_EUR_RATE`, `SESSION_COOKIE_INSECURE` und `APP_PORT`. Portainer setzt sie beim Deployment in das Compose-File ein.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `APP_SECRET` | ja | Mindestens 32 Zeichen; verschlüsselt die gespeicherten API-Keys. Nicht ändern, sonst sind die Keys verloren. |
| `REGISTRATION_CODE` | nein | Einladungscode für die Registrierung. Leer = Registrierung gesperrt |
| `DATA_DIR` | nein | Verzeichnis der SQLite-Datenbank bei `npm run dev`/`npm start`, Standard `./data`. Im Container fest `/app/data` |
| `SESSION_COOKIE_INSECURE` | nein | `true` setzt das Session-Cookie auch ohne HTTPS (nur LAN) |
| `ANTHROPIC_API_KEY` | nein | Serverweiter Fallback-Key; Nutzer ohne eigenen Key verwenden ihn |
| `ANTHROPIC_MODEL` | nein | Server-Vorgabe für das Modell, Standard `claude-opus-5`; jeder Nutzer kann im Konto ein anderes wählen |
| `USD_EUR_RATE` | nein | USD je 1 EUR als Ausweichkurs, wenn der EZB-Kurs nicht abrufbar ist (z. B. `1.08`) |
| `APP_PORT` | nein | Veröffentlichter Port bei Docker Compose, Standard 3000 |

## Bedienung

0. Anmelden oder mit Einladungscode registrieren. Unter „Konto“ den Anthropic-API-Key hinterlegen und bei Bedarf das Modell wählen.
1. docx-Datei in die Upload-Fläche ziehen oder auswählen (maximal 10 MB).
2. Der Text erscheint mit farbigen Markierungen je Kategorie. Kategorien lassen sich über die Legende ein- und ausblenden.
3. Ein Klick auf eine Markierung öffnet das Hinweisfeld mit Erklärung, Originalstelle und alternativer Formulierung. Mit `j`/`k` oder den Pfeiltasten geht es zur nächsten oder vorherigen Fundstelle.
4. „Alternativen mit Claude laden“ öffnet den Dialog mit Modellwahl und Kostenschätzung. Nach dem Start ersetzen Umformulierungen des Sprachmodells die festen Regelvorschläge, die Gesamteinschätzung und die Kosten des Durchlaufs erscheinen in der Zusammenfassung.
5. „Als docx mit Kommentaren exportieren“ lädt die kommentierte Kopie herunter.

Das geladene Dokument samt Fundstellen, Claude-Alternativen, Einschätzung und Kosten des Durchlaufs bleibt beim Wechsel zwischen Analyse und Konto sowie nach einem Neuladen der Seite erhalten. Es liegt dazu in der IndexedDB des Browsers, nicht auf dem Server, und wird gelöscht, sobald „Neue Datei“ geklickt oder abgemeldet wird. Ein anderes Konto am selben Browser sieht den Stand nicht.

## Grenzen

- Die Regeln erkennen Muster, keine Herkunft. Ein sauber formulierter KI-Text bleibt unauffällig, ein Mensch kann Floskeln schreiben.
- Geprüft wird nur Deutsch. Englische Texte liefern wenige Treffer.
- Text in Kopf- und Fußzeilen, Fußnoten und Textfeldern außerhalb des Hauptteils wird nicht analysiert.
- Kommentare werden an Absätze des Hauptteils gebunden. Trifft ein Offset keinen Textlauf (etwa bei Feldcodes), wird der ganze Absatz kommentiert.

## Projektstruktur

```
src/app/                 Seiten (Analyse, anmelden, registrieren, konto) und API-Routen
src/components/          Upload, Dokumentansicht, Hinweisfeld, Zusammenfassung, Header, Formularfelder
src/lib/analysis/        Typen, Regeln (rules/), Analyse, Score
src/lib/costs/           Modellpreise, Kostenbuchung, Schätzung, EZB-Wechselkurs, Formatierung
src/lib/docx/            docx-Parser und Kommentar-Export (JSZip, xmldom)
src/lib/llm/             Anthropic-Client, Modelle, Prompts, Structured Outputs
src/lib/auth/            Passwörter, Sessions, Verschlüsselung, Nutzer, Data-Access-Schicht
src/lib/db.ts            SQLite (node:sqlite) mit Schema-Migration
src/lib/session-store.ts Analysestand im Browser (IndexedDB), überlebt Seitenwechsel und Reload
src/proxy.ts             Leitet ohne Session-Cookie auf /anmelden um, außer /api/health
src/instrumentation.ts   Prüft APP_SECRET und öffnet die Datenbank beim Start
tests/                   vitest-Tests und Fixture-Dokumente
scripts/make-fixtures.ts erzeugt die Fixture-Dokumente
scripts/make-icons.ts    erzeugt icon.svg, favicon.ico und apple-icon.png in src/app aus src/lib/logo.ts
```

## Lizenz

Siehe [LICENSE](LICENSE).

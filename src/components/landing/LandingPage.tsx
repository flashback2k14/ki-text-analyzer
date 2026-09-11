import Link from "next/link";
import { Archivo } from "next/font/google";
import pkg from "../../../package.json";
import { AUTHOR, LICENSE_NAME, REPO_URL } from "@/lib/about";
import { isRegistrationOpen } from "@/lib/auth/registration";
import "./landing.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/**
 * Beispieltext aus der Regelprüfung. Die Fundstellen stammen aus einem echten Lauf von
 * analyzeText() über genau diesen Absatz (5 Funde, 40 Wörter, Score 52 „auffällig“).
 */
const SAMPLE_FINDINGS = [
  {
    category: "Aufgeblähte Bedeutung",
    quote: "spielt eine wichtige Rolle",
    message:
      "Bedeutung wird behauptet statt gezeigt. Nenne, was konkret geschieht oder gilt.",
  },
  {
    category: "Redaktioneller Kommentar",
    quote: "Es ist wichtig zu beachten",
    message:
      "Der Text bewertet sich selbst. Wenn etwas wichtig ist, zeigt sich das am Inhalt.",
  },
  {
    category: "Werbesprache",
    quote: "im Herzen der",
    message: "Prospektformel. Besser: „in der Mitte von“ oder eine Ortsangabe.",
  },
  {
    category: "KI-Modewort",
    quote: "nahtlos",
    message:
      "Modewort ohne Aussage. „ohne Unterbrechung“, „direkt“ oder streichen.",
  },
  {
    category: "Aufgeblähte Bedeutung",
    quote: "gilt als Zeugnis für",
    message: "Feierliche Deutungsformel. „ist“ oder „zeigt“ trifft es genauer.",
  },
];

const CLAIMS = [
  {
    index: "01",
    text: "Ein Gedankenstrich beweist nichts. Ab sechs auf tausend Wörter zählt die Prüfung das als Muster.",
    note: "Gewichtet wird die Dichte der Funde, nicht ihre Summe. Ein langer Text darf sich mehr erlauben als ein kurzer.",
  },
  {
    index: "02",
    text: "Der Text bleibt auf dem Server. An die Anthropic-API geht er erst, wenn Sie es auslösen.",
    note: "Die Regelprüfung läuft ohne API-Key und gibt bei gleichem Text jedes Mal dasselbe Ergebnis.",
  },
  {
    index: "03",
    text: "Die Prüfung urteilt nicht über die Herkunft. Sie zeigt Stellen und sagt, was an ihnen auffällt.",
    note: "Zu jeder Fundstelle steht eine Begründung, dazu ein Vorschlag, wie sich die Stelle anders formulieren lässt.",
  },
];

const STAGES = [
  {
    numeral: "1",
    title: "dokument hochladen",
    body: "Eine .docx-Datei, per Auswahl oder Ablegen. Der Server liest Absätze, Überschriften und Listen aus der Datei.",
    unit: "docx",
  },
  {
    numeral: "2",
    title: "regeln laufen lokal",
    body: "16 Regeln prüfen den Text auf Floskeln, Modewörter, Satzbau, Struktur, Formatierung und Reste aus Chatbot-Ausgaben. Daraus entstehen Score, Stufe und Statistik.",
    unit: "ohne API-Key",
  },
  {
    numeral: "3",
    title: "claude auf knopfdruck",
    body: "Vor dem Aufruf zeigt ein Dialog Modell und geschätzte Kosten. Danach steht an jeder Fundstelle eine alternative Formulierung mit Begründung.",
    unit: "optional",
  },
  {
    numeral: "4",
    title: "als docx zurück",
    body: "Der Export legt eine Kopie der Originaldatei an. Jede Fundstelle hängt als Word-Kommentar am betroffenen Text, Score und Statistik stehen am ersten Absatz.",
    unit: "Word-Kommentare",
  },
];

export function LandingPage() {
  const registrationOpen = isRegistrationOpen();

  return (
    <main className={`${archivo.variable} lp`}>
      <div className="lp__rails" aria-hidden="true" />

      <section className="lp__band lp__hero">
        <div className="lp__shell lp__grid">
          <h1 className="lp__display">
            ein merkmal beweist nichts. die häufung schon
            <span className="lp__period" aria-hidden="true" />
          </h1>
          <p className="lp__lede">
            Der KI-Text-Analyzer prüft deutsche Word-Dokumente auf die Muster,
            an denen sich generierte Texte erkennen lassen, und markiert jede
            Stelle einzeln im Text.
          </p>
          <div className="lp__cta-row">
            <Link href="/anmelden" className="lp__button">
              Anmelden
            </Link>
            <a
              className="lp__link"
              href={REPO_URL}
              rel="noreferrer noopener"
              target="_blank"
            >
              Quellcode auf GitHub
            </a>
          </div>
          <div className="lp__meta">
            <dl>
              <dt>16</dt>
              <dd className="lp__label">Regeln</dd>
              <dt>10</dt>
              <dd className="lp__label">Kategorien</dd>
              <dt>0–100</dt>
              <dd className="lp__label">Score</dd>
            </dl>
          </div>
        </div>
      </section>

      <section className="lp__band lp__claims">
        <div className="lp__shell lp__grid">
          {CLAIMS.map((claim) => (
            <div className="lp__claim" key={claim.index}>
              <span className="lp__claim-index lp__label">{claim.index}</span>
              <p className="lp__claim-text">{claim.text}</p>
              <p className="lp__claim-note">{claim.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="lp__band lp__sample"
        aria-labelledby="lp-sample-title"
      >
        <div className="lp__shell lp__grid">
          <div className="lp__sample-head">
            <h2 className="lp__title" id="lp-sample-title">
              so sieht ein geprüfter absatz aus
            </h2>
          </div>

          <div className="lp__sample-text">
            <span className="lp__label">Beispieltext</span>
            <p>
              Das Stadtarchiv{" "}
              <mark className="lp__mark">spielt eine wichtige Rolle</mark> für
              die Erinnerungskultur der Region.{" "}
              <mark className="lp__mark">Es ist wichtig zu beachten</mark>, dass
              die Bestände <mark className="lp__mark">im Herzen der</mark>{" "}
              Altstadt lagern und <mark className="lp__mark">nahtlos</mark>{" "}
              digitalisiert werden. Fazit: Das Archiv{" "}
              <mark className="lp__mark">gilt als Zeugnis für</mark> die reiche
              Geschichte der Stadt.
            </p>
          </div>

          <ul className="lp__sample-findings">
            {SAMPLE_FINDINGS.map((finding) => (
              <li
                className="lp__finding"
                key={finding.quote + finding.category}
              >
                <span className="lp__finding-cat lp__label">
                  {finding.category}
                </span>
                <span className="lp__finding-quote">„{finding.quote}“</span>
                <p className="lp__finding-msg">{finding.message}</p>
              </li>
            ))}
          </ul>

          <p className="lp__sample-foot">
            <span className="lp__label">5 Fundstellen auf 40 Wörter</span>
            <span className="lp__label">Score 52 von 100</span>
            <span className="lp__label">Stufe: auffällig</span>
          </p>
        </div>
      </section>

      <section className="lp__plate" aria-labelledby="lp-plate-claim">
        <div className="lp__shell lp__grid">
          <p className="lp__plate-claim" id="lp-plate-claim">
            der score ist ein verdacht, kein urteil
            <span className="lp__period lp__period--paper" aria-hidden="true" />
          </p>
          <div className="lp__scale">
            <div className="lp__step">
              <div className="lp__step-range">0–29</div>
              <p className="lp__step-label">unauffällig</p>
              <div className="lp__bar" aria-hidden="true" />
            </div>
            <div className="lp__step">
              <div className="lp__step-range">30–64</div>
              <p className="lp__step-label">auffällig</p>
              <div className="lp__bar" aria-hidden="true" />
            </div>
            <div className="lp__step">
              <div className="lp__step-range">65–100</div>
              <p className="lp__step-label">stark verdächtig</p>
              <div className="lp__bar" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="lp__band lp__flow" aria-labelledby="lp-flow-title">
        <div className="lp__shell lp__grid">
          <div className="lp__flow-head">
            <h2 className="lp__title" id="lp-flow-title">
              vier schritte vom dokument zur kommentierten kopie
            </h2>
          </div>
          {STAGES.map((stage) => (
            <div className="lp__stage" key={stage.numeral}>
              <span className="lp__stage-numeral" aria-hidden="true">
                {stage.numeral}
              </span>
              <h3 className="lp__stage-title">{stage.title}</h3>
              <div className="lp__stage-body">
                <p>{stage.body}</p>
                <span className="lp__label">{stage.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp__band lp__trust" aria-labelledby="lp-trust-title">
        <div className="lp__shell lp__grid">
          <div className="lp__trust-head">
            <h2 className="lp__title" id="lp-trust-title">
              wo der text liegt
            </h2>
          </div>

          <div className="lp__trust-col lp__trust-col--local">
            <span className="lp__label">Bleibt auf dem Server</span>
            <h3>ohne fremden dienst</h3>
            <ul className="lp__trust-list">
              <li>Regelprüfung, Score und Statistik</li>
              <li>Der Export mit Word-Kommentaren</li>
              <li>Konten und Sitzungen in einer SQLite-Datei</li>
              <li>Passwörter mit scrypt gehasht</li>
            </ul>
          </div>

          <div className="lp__trust-col lp__trust-col--api">
            <span className="lp__label">Erst auf Auslösung</span>
            <h3>anthropic-api</h3>
            <ul className="lp__trust-list">
              <li>
                Die Fundstellen gehen an Claude, wenn Sie den Aufruf bestätigen
              </li>
              <li>
                Jedes Konto hinterlegt seinen eigenen API-Key, verschlüsselt mit
                AES-256-GCM
              </li>
              <li>
                Die Kosten stehen je Durchlauf und Modell im Konto, in Euro zum
                EZB-Kurs
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="lp__band lp__close" aria-labelledby="lp-close-title">
        <div className="lp__shell lp__grid">
          <h2 className="lp__close-title" id="lp-close-title">
            einen selbst geschriebenen absatz prüfen
          </h2>
          <div className="lp__close-action">
            <Link href="/anmelden" className="lp__button">
              Anmelden
            </Link>
            {registrationOpen && (
              <Link href="/registrieren" className="lp__link">
                Konto anlegen
              </Link>
            )}
          </div>
          <p className="lp__close-note">
            {registrationOpen
              ? "Für ein neues Konto brauchen Sie den Einladungscode dieser Installation."
              : "Neue Konten legt diese Installation gerade nicht an. Wer eigene Konten braucht, betreibt den Analyzer selbst."}
          </p>
        </div>
      </section>

      <footer className="lp__band lp__colophon">
        <div className="lp__shell lp__grid">
          <p>
            KI-Text-Analyzer {pkg.version}. Geprüft wird nach den
            Wikipedia-Seiten{" "}
            <a
              className="lp__link"
              href="https://de.wikipedia.org/wiki/Wikipedia:Anzeichen_f%C3%BCr_KI-generierte_Inhalte"
              rel="noreferrer noopener"
              target="_blank"
            >
              Anzeichen für KI-generierte Inhalte
            </a>{" "}
            und{" "}
            <a
              className="lp__link"
              href="https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing"
              rel="noreferrer noopener"
              target="_blank"
            >
              Signs of AI writing
            </a>
            . Gesetzt in Archivo. {LICENSE_NAME}, {AUTHOR}. Quellcode und
            Docker-Setup:{" "}
            <a
              className="lp__link"
              href={REPO_URL}
              rel="noreferrer noopener"
              target="_blank"
            >
              github.com/flashback2k14/ki-text-analyzer
            </a>
            .
          </p>
        </div>
      </footer>
    </main>
  );
}

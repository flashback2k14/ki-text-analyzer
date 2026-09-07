/**
 * Erzeugt Test-Dokumente unter tests/fixtures/.
 * Aufruf: npm run fixtures
 */
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const outDir = path.resolve("tests/fixtures");
fs.mkdirSync(outDir, { recursive: true });

const numbering = {
  config: [
    {
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT }],
    },
    {
      reference: "numbers",
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT }],
    },
  ],
};

function p(text: string, opts: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] } = {}) {
  return new Paragraph({ text, heading: opts.heading });
}

function bulletWithBoldHeader(label: string, rest: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text: `${label}:`, bold: true }), new TextRun({ text: ` ${rest}` })],
  });
}

const kiTypisch = new Document({
  numbering,
  sections: [
    {
      children: [
        p("Die Digitale Transformation Im Mittelstand", { heading: HeadingLevel.HEADING_1 }),
        p(
          "Die digitale Transformation spielt eine bedeutende Rolle in der heutigen Geschäftswelt – sie ist nicht nur ein technisches Thema, sondern auch ein kultureller Wandel – und unterstreicht die Bedeutung einer klaren Strategie.",
        ),
        p(
          "Es ist wichtig zu beachten, dass Studien zeigen, dass Unternehmen mit einer robusten Digitalstrategie nahtlos in die digitale Landschaft eintauchen können. Das Konzept fungiert als Wegweiser für die gesamte Organisation.",
        ),
        p(
          "Darüber hinaus verfügt der Mittelstand über ein reiches kulturelles Erbe, das als Zeugnis unternehmerischer Stärke steht. Die Digitalisierung dient als Katalysator, wodurch die Bedeutung des Wandels unterstrichen wird.",
        ),
        p("Zusätzlich verfasste der Geschäftsführer ein Konzept, das schnell, zuverlässig und elegant umgesetzt wurde. Experten sind sich einig, dass dieser Ansatz zukunftsweisend ist."),
        p("Außerdem hat das Vorhaben in überregionalen Medien Beachtung gefunden und wurde in der Fachpresse besprochen."),
        p("Wichtige Erfolgsfaktoren", { heading: HeadingLevel.HEADING_2 }),
        bulletWithBoldHeader("Flexibilität", "Das System erlaubt schnelle Anpassungen."),
        bulletWithBoldHeader("Skalierbarkeit", "Die Architektur wächst mit dem Unternehmen."),
        bulletWithBoldHeader("Sicherheit", "Daten werden nach modernen Standards geschützt."),
        p("Weitere Informationen finden sich unter https://example.com/artikel?utm_source=chatgpt.com sowie in der Studie :contentReference[oaicite:0]{index=0}."),
        p("Herausforderungen und Ausblick", { heading: HeadingLevel.HEADING_2 }),
        p("Trotz seiner Erfolge steht der Mittelstand vor mehreren Herausforderungen. Die Zukunftsaussichten bleiben jedoch vielversprechend."),
        p("Fazit", { heading: HeadingLevel.HEADING_2 }),
        p("Zusammenfassend lässt sich sagen, dass die digitale Transformation ein facettenreicher Prozess ist. Ich hoffe, das hilft!"),
      ],
    },
  ],
});

const menschlich = new Document({
  numbering,
  sections: [
    {
      children: [
        p("Umbau der Werkstatt", { heading: HeadingLevel.HEADING_1 }),
        p("Im Frühjahr haben wir die Werkstatt umgebaut. Die alte Werkbank war zu niedrig, und der Drucker stand direkt neben dem Fenster, wo es im Winter zieht."),
        p("Der neue Platz für den A1 Mini ist hinten links. Dort ist es wärmer, und das Filament liegt jetzt in einer Kiste mit Trockenmittel. Seitdem gibt es weniger Fadenzieher beim Drucken."),
        p("Die Werkbank haben wir um zehn Zentimeter erhöht. Das klingt wenig, aber man merkt es beim Löten sofort. Die Lampe hängt jetzt mittig über dem Tisch."),
        p("Was noch fehlt, ist ein Regal für die Kisten mit Schrauben. Vielleicht drucken wir die Halter dafür selbst, das ist eher eine Frage der Zeit als des Materials."),
        p("Kosten bisher: Holz 80 Euro, Lampe 35 Euro, Kleinteile etwa 20 Euro."),
      ],
    },
  ],
});

const tabellenListen = new Document({
  numbering,
  sections: [
    {
      children: [
        p("Bericht mit Tabelle", { heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
          children: [
            new TextRun({ text: "Dieser Absatz hat ", bold: false }),
            new TextRun({ text: "geteilte", bold: true }),
            new TextRun({ text: " Runs und spielt eine bedeutende Rolle im Test." }),
          ],
        }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, text: "Erster Punkt der Liste." }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, text: "Zweiter Punkt – mit einem Gedankenstrich – und noch einem." }),
        new Table({
          columnWidths: [4500, 4500],
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 4500, type: WidthType.DXA }, children: [p("Zelle A")] }),
                new TableCell({ width: { size: 4500, type: WidthType.DXA }, children: [p("Es ist bemerkenswert, dass Zelle B Text enthält.")] }),
              ],
            }),
          ],
        }),
        p("Letzter Absatz nach der Tabelle."),
      ],
    },
  ],
});

async function write(name: string, doc: Document) {
  const buf = await Packer.toBuffer(doc);
  const file = path.join(outDir, name);
  fs.writeFileSync(file, buf);
  console.log(`geschrieben: ${file} (${buf.length} Bytes)`);
}

async function main() {
  await write("ki-typisch.docx", kiTypisch);
  await write("menschlich.docx", menschlich);
  await write("tabellen-listen.docx", tabellenListen);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

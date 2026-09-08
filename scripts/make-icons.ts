/**
 * Erzeugt aus dem Logo (src/lib/logo.ts) die Icon-Dateien im App-Verzeichnis:
 * icon.svg (Favicon für moderne Browser), favicon.ico (32 px, PNG im ICO-Container) und apple-icon.png (180 px).
 * Aufruf: npm run icons
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { logoSvg } from "../src/lib/logo";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app");

/** Verpackt eine PNG in einen ICO-Container mit einem Eintrag (PNG-Einträge sind seit Windows Vista erlaubt). */
function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserviert
  header.writeUInt16LE(1, 2); // Typ 1 = Icon
  header.writeUInt16LE(1, 4); // ein Eintrag
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // Breite
  entry.writeUInt8(size === 256 ? 0 : size, 1); // Höhe
  entry.writeUInt8(0, 2); // Farbpalette
  entry.writeUInt8(0, 3); // reserviert
  entry.writeUInt16LE(1, 4); // Farbebenen
  entry.writeUInt16LE(32, 6); // Bit je Pixel
  entry.writeUInt32LE(png.length, 8); // Datengröße
  entry.writeUInt32LE(header.length + entry.length, 12); // Offset der Daten
  return Buffer.concat([header, entry, png]);
}

async function main() {
  const svg = logoSvg();
  writeFileSync(join(appDir, "icon.svg"), svg);

  const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  writeFileSync(join(appDir, "favicon.ico"), pngToIco(png32, 32));

  const png180 = await sharp(Buffer.from(svg)).resize(180, 180).png().toBuffer();
  writeFileSync(join(appDir, "apple-icon.png"), png180);

  console.log("icon.svg, favicon.ico und apple-icon.png in src/app geschrieben.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

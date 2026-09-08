// Ohne Node-Imports: wird vom Icon-Skript und von der Logo-Komponente genutzt.

export const LOGO_SIZE = 32;

export interface LogoShape {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  fill: string;
}

/**
 * Motiv: blaues Quadrat, darin ein Blatt mit drei Textzeilen, eine davon gelb markiert
 * (wie die Fundstellen in der Dokumentansicht). Feste Farben, damit es hell wie dunkel gleich aussieht.
 */
export const LOGO_SHAPES: LogoShape[] = [
  { x: 0, y: 0, w: 32, h: 32, rx: 7, fill: "#2563eb" },
  { x: 8, y: 6, w: 16, h: 20, rx: 2, fill: "#ffffff" },
  { x: 11, y: 10, w: 10, h: 2, rx: 1, fill: "#2563eb" },
  { x: 10.4, y: 13.5, w: 11.2, h: 4.4, rx: 1.3, fill: "#fde68a" },
  { x: 11, y: 14.7, w: 10, h: 2, rx: 1, fill: "#1e3a8a" },
  { x: 11, y: 19.4, w: 6, h: 2, rx: 1, fill: "#2563eb" },
];

/** SVG-Markup des Logos, z. B. für app/icon.svg. */
export function logoSvg(size = LOGO_SIZE): string {
  const rects = LOGO_SHAPES.map((s) => `  <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx}" fill="${s.fill}"/>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}">\n${rects}\n</svg>\n`;
}

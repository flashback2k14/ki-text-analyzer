import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Document, Element, Node } from "@xmldom/xmldom";

export const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const XML_NS = "http://www.w3.org/XML/1998/namespace";

export function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

export function serializeXml(doc: Document): string {
  const body = new XMLSerializer().serializeToString(doc);
  return body.startsWith("<?xml") ? body : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`;
}

export function isElement(node: Node | null | undefined): node is Element {
  return !!node && node.nodeType === 1;
}

export function localName(el: Element): string {
  return el.localName ?? el.nodeName.replace(/^.*:/, "");
}

/** Direkte Kindelemente mit dem angegebenen lokalen Namen im WordprocessingML-Namensraum. */
export function childElements(el: Element, name?: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes.item(i);
    if (isElement(child) && (!name || (localName(child) === name && child.namespaceURI === W_NS))) {
      out.push(child);
    }
  }
  return out;
}

export function firstChild(el: Element, name: string): Element | undefined {
  return childElements(el, name)[0];
}

/** Alle Nachfahren mit lokalem Namen (Dokumentreihenfolge). */
export function descendants(el: Element, name: string): Element[] {
  const list = el.getElementsByTagNameNS(W_NS, name);
  const out: Element[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.item(i) as Element);
  return out;
}

export function getWAttr(el: Element, name: string): string | null {
  return el.getAttributeNS(W_NS, name) ?? el.getAttribute(`w:${name}`);
}

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

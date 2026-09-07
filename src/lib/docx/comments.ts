import type { Document, Element, Node } from "@xmldom/xmldom";
import { bodyParagraphs, openDocx, paragraphRuns, runText } from "./parse";
import { childElements, firstChild, isElement, localName, parseXml, serializeXml, W_NS, XML_NS, xmlEscape } from "./xml";

export interface CommentSpec {
  paragraphIndex: number;
  /** Zeichen-Offset im Absatztext (Verkettung der Runs). */
  start: number;
  end: number;
  /** Kommentartext; Zeilenumbrüche ergeben eigene Absätze im Kommentar. */
  text: string;
}

export interface CommentOptions {
  author?: string;
  initials?: string;
  date?: Date;
}

const NS_DECL =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" ' +
  'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" ' +
  'xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" ' +
  'xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" ' +
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'mc:Ignorable="w14 w15 w16cid w16cex"';

const PARTS = {
  comments: {
    path: "word/comments.xml",
    root: "w:comments",
    relType: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml",
  },
  extended: {
    path: "word/commentsExtended.xml",
    root: "w15:commentsEx",
    relType: "http://schemas.microsoft.com/office/2011/relationships/commentsExtended",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml",
  },
  ids: {
    path: "word/commentsIds.xml",
    root: "w16cid:commentsIds",
    relType: "http://schemas.microsoft.com/office/2016/09/relationships/commentsIds",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsIds+xml",
  },
  extensible: {
    path: "word/commentsExtensible.xml",
    root: "w16cex:commentsExtensible",
    relType: "http://schemas.microsoft.com/office/2018/08/relationships/commentsExtensible",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtensible+xml",
  },
} as const;

function hexId(): string {
  const n = Math.floor(Math.random() * 0x7ffffffe) + 1;
  return n.toString(16).toUpperCase().padStart(8, "0");
}

function emptyPart(root: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<${root} ${NS_DECL}></${root}>`;
}

/** Fügt XML-Fragmente vor dem schließenden Root-Tag ein. */
function appendToPart(existing: string | null, root: string, fragments: string[]): string {
  const base = existing ?? emptyPart(root);
  const closing = `</${root}>`;
  const idx = base.lastIndexOf(closing);
  if (idx < 0) {
    // Selbstschließendes Root-Element (<w:comments .../>)
    const selfClosing = base.replace(/\/>\s*$/, ">");
    return `${selfClosing}${fragments.join("")}${closing}`;
  }
  return `${base.slice(0, idx)}${fragments.join("")}${base.slice(idx)}`;
}

function nextCommentId(commentsXml: string | null): number {
  if (!commentsXml) return 0;
  let max = -1;
  for (const m of commentsXml.matchAll(/<w:comment\b[^>]*\bw:id="(\d+)"/g)) {
    max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function ensureRelationships(rels: string): string {
  let out = rels;
  let maxRid = 0;
  for (const m of out.matchAll(/Id="rId(\d+)"/g)) maxRid = Math.max(maxRid, Number(m[1]));
  for (const part of Object.values(PARTS)) {
    if (out.includes(`Type="${part.relType}"`)) continue;
    maxRid += 1;
    const target = part.path.replace(/^word\//, "");
    const rel = `<Relationship Id="rId${maxRid}" Type="${part.relType}" Target="${target}"/>`;
    out = out.replace(/<\/Relationships>\s*$/, `${rel}</Relationships>`);
  }
  return out;
}

function ensureContentTypes(ct: string): string {
  let out = ct;
  for (const part of Object.values(PARTS)) {
    const partName = `/${part.path}`;
    if (out.includes(`PartName="${partName}"`)) continue;
    const override = `<Override PartName="${partName}" ContentType="${part.contentType}"/>`;
    out = out.replace(/<\/Types>\s*$/, `${override}</Types>`);
  }
  return out;
}

function commentXml(id: number, text: string, author: string, initials: string, date: string, paraIds: string[]): string {
  const lines = text.split("\n");
  const paragraphs = lines.map((line, i) => {
    const ref = i === 0 ? '<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:annotationRef/></w:r>' : "";
    const run = line.length ? `<w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>` : "";
    return `<w:p w14:paraId="${paraIds[i]}" w14:textId="77777777">${ref}${run}</w:p>`;
  });
  return `<w:comment w:id="${id}" w:author="${xmlEscape(author)}" w:date="${date}" w:initials="${xmlEscape(initials)}">${paragraphs.join("")}</w:comment>`;
}

interface RunSlot {
  run: Element;
  start: number;
  end: number;
}

/** Der Vorfahr des Runs, der direktes Kind von w:p ist (Run selbst oder z. B. w:hyperlink). */
function anchorOf(run: Element, p: Element): Element {
  let cur: Element = run;
  while (cur.parentNode && cur.parentNode !== p && isElement(cur.parentNode)) {
    cur = cur.parentNode;
  }
  return cur;
}

function makeRunElement(doc: Document, template: Element): Element {
  const r = doc.createElementNS(W_NS, "w:r");
  const rPr = firstChild(template, "rPr");
  if (rPr) r.appendChild(rPr.cloneNode(true));
  return r;
}

function makeT(doc: Document, text: string): Element {
  const t = doc.createElementNS(W_NS, "w:t");
  t.setAttributeNS(XML_NS, "xml:space", "preserve");
  t.appendChild(doc.createTextNode(text));
  return t;
}

/** Teilt einen Run am Zeichen-Offset (relativ zum Run) in zwei Runs und ersetzt ihn im DOM. */
function splitRun(doc: Document, run: Element, offset: number): [Element, Element] {
  const left = makeRunElement(doc, run);
  const right = makeRunElement(doc, run);
  let pos = 0;
  for (const child of childElements(run)) {
    const name = localName(child);
    if (name === "rPr") continue;
    let len = 0;
    if (name === "t") len = (child.textContent ?? "").length;
    else if (name === "tab" || name === "br" || name === "cr" || name === "noBreakHyphen") len = 1;
    const childStart = pos;
    const childEnd = pos + len;
    pos = childEnd;
    if (childEnd <= offset) {
      left.appendChild(child.cloneNode(true));
    } else if (childStart >= offset) {
      right.appendChild(child.cloneNode(true));
    } else {
      // Nur w:t kann geteilt werden.
      const text = child.textContent ?? "";
      const cut = offset - childStart;
      left.appendChild(makeT(doc, text.slice(0, cut)));
      right.appendChild(makeT(doc, text.slice(cut)));
    }
  }
  const parent = run.parentNode!;
  parent.insertBefore(left, run);
  parent.insertBefore(right, run);
  parent.removeChild(run);
  return [left, right];
}

function referenceRun(doc: Document, id: number): Element {
  const r = doc.createElementNS(W_NS, "w:r");
  const rPr = doc.createElementNS(W_NS, "w:rPr");
  const style = doc.createElementNS(W_NS, "w:rStyle");
  style.setAttributeNS(W_NS, "w:val", "CommentReference");
  rPr.appendChild(style);
  r.appendChild(rPr);
  const ref = doc.createElementNS(W_NS, "w:commentReference");
  ref.setAttributeNS(W_NS, "w:id", String(id));
  r.appendChild(ref);
  return r;
}

function marker(doc: Document, name: "commentRangeStart" | "commentRangeEnd", id: number): Element {
  const el = doc.createElementNS(W_NS, `w:${name}`);
  el.setAttributeNS(W_NS, "w:id", String(id));
  return el;
}

function insertAfter(parent: Node, node: Node, ref: Node) {
  if (ref.nextSibling) parent.insertBefore(node, ref.nextSibling);
  else parent.appendChild(node);
}

/** Markiert den gesamten Absatz (Fallback, wenn die Offsets nicht zu den Runs passen). */
function annotateWholeParagraph(doc: Document, p: Element, id: number) {
  const pPr = firstChild(p, "pPr");
  const start = marker(doc, "commentRangeStart", id);
  if (pPr) insertAfter(p, start, pPr);
  else if (p.firstChild) p.insertBefore(start, p.firstChild);
  else p.appendChild(start);
  p.appendChild(marker(doc, "commentRangeEnd", id));
  p.appendChild(referenceRun(doc, id));
}

function annotateParagraph(doc: Document, p: Element, specs: { id: number; start: number; end: number }[]) {
  const text = paragraphRuns(p).map(runText).join("");
  const slots = (): RunSlot[] => {
    let pos = 0;
    return paragraphRuns(p).map((run) => {
      const len = runText(run).length;
      const slot = { run, start: pos, end: pos + len };
      pos += len;
      return slot;
    });
  };

  for (const spec of specs) {
    const valid = spec.start >= 0 && spec.end > spec.start && spec.end <= text.length;
    if (!valid) {
      annotateWholeParagraph(doc, p, spec.id);
      continue;
    }
    // Run-Grenzen an Start und Ende erzeugen.
    for (const boundary of [spec.start, spec.end]) {
      const hit = slots().find((s) => s.start < boundary && boundary < s.end);
      if (hit) splitRun(doc, hit.run, boundary - hit.start);
    }
    const current = slots();
    const first = current.find((s) => s.start === spec.start && s.end > s.start);
    const last = [...current].reverse().find((s) => s.end === spec.end && s.end > s.start);
    if (!first || !last) {
      annotateWholeParagraph(doc, p, spec.id);
      continue;
    }
    const startAnchor = anchorOf(first.run, p);
    const endAnchor = anchorOf(last.run, p);
    p.insertBefore(marker(doc, "commentRangeStart", spec.id), startAnchor);
    const end = marker(doc, "commentRangeEnd", spec.id);
    insertAfter(p, end, endAnchor);
    insertAfter(p, referenceRun(doc, spec.id), end);
  }
}

export async function addCommentsToDocx(
  data: ArrayBuffer | Uint8Array | Buffer,
  comments: CommentSpec[],
  options: CommentOptions = {},
): Promise<Uint8Array> {
  const author = options.author ?? "KI-Text-Analyzer";
  const initials = options.initials ?? "KI";
  const date = (options.date ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");

  const zip = await openDocx(data);
  const docXml = await zip.file("word/document.xml")!.async("string");
  const doc = parseXml(docXml);
  const paragraphs = bodyParagraphs(doc);

  const existingComments = (await zip.file(PARTS.comments.path)?.async("string")) ?? null;
  let nextId = nextCommentId(existingComments);

  const commentFragments: string[] = [];
  const extendedFragments: string[] = [];
  const idsFragments: string[] = [];
  const extensibleFragments: string[] = [];
  const byParagraph = new Map<number, { id: number; start: number; end: number }[]>();

  for (const c of comments) {
    if (c.paragraphIndex < 0 || c.paragraphIndex >= paragraphs.length) continue;
    const id = nextId++;
    const lines = c.text.split("\n");
    const paraIds = lines.map(() => hexId());
    const durableId = hexId();
    commentFragments.push(commentXml(id, c.text, author, initials, date, paraIds));
    extendedFragments.push(`<w15:commentEx w15:paraId="${paraIds[paraIds.length - 1]}" w15:done="0"/>`);
    idsFragments.push(`<w16cid:commentId w16cid:paraId="${paraIds[paraIds.length - 1]}" w16cid:durableId="${durableId}"/>`);
    extensibleFragments.push(`<w16cex:commentExtensible w16cex:durableId="${durableId}" w16cex:dateUtc="${date}"/>`);
    const list = byParagraph.get(c.paragraphIndex) ?? [];
    list.push({ id, start: c.start, end: c.end });
    byParagraph.set(c.paragraphIndex, list);
  }

  for (const [index, specs] of byParagraph) {
    specs.sort((a, b) => a.start - b.start || a.end - b.end);
    annotateParagraph(doc, paragraphs[index], specs);
  }

  zip.file("word/document.xml", serializeXml(doc));
  zip.file(PARTS.comments.path, appendToPart(existingComments, PARTS.comments.root, commentFragments));
  zip.file(
    PARTS.extended.path,
    appendToPart((await zip.file(PARTS.extended.path)?.async("string")) ?? null, PARTS.extended.root, extendedFragments),
  );
  zip.file(PARTS.ids.path, appendToPart((await zip.file(PARTS.ids.path)?.async("string")) ?? null, PARTS.ids.root, idsFragments));
  zip.file(
    PARTS.extensible.path,
    appendToPart((await zip.file(PARTS.extensible.path)?.async("string")) ?? null, PARTS.extensible.root, extensibleFragments),
  );

  const relsPath = "word/_rels/document.xml.rels";
  const rels =
    (await zip.file(relsPath)?.async("string")) ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  zip.file(relsPath, ensureRelationships(rels));

  const ctPath = "[Content_Types].xml";
  const ct = await zip.file(ctPath)?.async("string");
  if (ct) zip.file(ctPath, ensureContentTypes(ct));

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

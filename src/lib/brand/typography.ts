// French typography (guidelines 03, « Setting type ») and the small markup used in fields:
// *italic*, **bold**, Enter for a line break, an empty line between paragraphs.

export const NNBSP = " "; // narrow no-break space

/** Applied at render time, so Rebeca can type plain text. */
export function frenchTypo(input: string): string {
  let s = input;
  s = s.replace(/\.\.\./g, "…");
  s = s.replace(/'/g, "’");
  s = s.replace(/<<\s*/g, "«").replace(/\s*>>/g, "»");
  s = s.replace(/"([^"\n]*)"/g, "«$1»");
  s = s.replace(/«[   ]*/g, "«" + NNBSP).replace(/[   ]*»/g, NNBSP + "»");
  // Before ; : ! ? the space becomes a narrow no-break space…
  s = s.replace(/[   ]+([;:!?])/g, NNBSP + "$1");
  // …and is added before ; ! ? when it was forgotten (not inside URLs: needs a space or the end after).
  s = s.replace(/([\p{L}\d»)*])([;!?])(?=\s|$|\*)/gu, "$1" + NNBSP + "$2");
  // 60 % · 1500 €
  s = s.replace(/(\d)[   ]?(%|€)/g, "$1" + NNBSP + "$2");
  // Short words stay with the next one at the end of a line: « à », « de », « 15 ans »…
  s = s.replace(/(?<=^|\s)(\d+|[aàyô]|de|du|le|la|les|un|une|et|en|ou|on) (?=\S)/gi, "$1 ");
  return s;
}

export type Inline = { text: string; em: boolean; strong: boolean };
export type Line = Inline[];
export type Paragraph = Line[];

/** Splits text into paragraphs (empty line) and lines (Enter), each a run of styled pieces. */
export function parseRich(input: string, typo = true): Paragraph[] {
  const text = (typo ? frenchTypo(input) : input).replace(/\r/g, "").trim();
  if (!text) return [];
  return text.split(/\n\s*\n/).map((para) => para.split("\n").map(parseInline));
}

export function parseInline(line: string): Line {
  const out: Inline[] = [];
  let em = false;
  let strong = false;
  let buf = "";
  const flush = () => {
    if (buf) out.push({ text: buf, em, strong });
    buf = "";
  };
  for (let i = 0; i < line.length; i++) {
    if (line.startsWith("**", i)) {
      flush();
      strong = !strong;
      i++;
    } else if (line[i] === "*") {
      flush();
      em = !em;
    } else {
      buf += line[i];
    }
  }
  flush();
  return out;
}

/** The plain text a reader sees, without markup. */
export function plainText(input: string): string {
  return input.replace(/\*\*|\*/g, "").trim();
}

// ——— Rich text for document pages: paragraphs, « ## » subheadings, « - » bullets, « 1. » steps ———

export type Block = { type: "p"; lines: Line[] } | { type: "h"; line: Line } | { type: "ul" | "ol"; items: Line[] };

export function parseBlocks(input: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", lines: para.map(parseInline) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: list.type, items: list.items.map(parseInline) });
    list = null;
  };
  for (const raw of frenchTypo(input).replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) {
      flushPara();
      flushList();
    } else if ((m = line.match(/^#{2,3}\s+(.*)$/))) {
      flushPara();
      flushList();
      blocks.push({ type: "h", line: parseInline(m[1]) });
    } else if ((m = line.match(/^[-–•]\s+(.*)$/)) || (m = line.match(/^\d+[.)]\s+(.*)$/))) {
      const type = /^\d/.test(line) ? "ol" : "ul";
      flushPara();
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(m[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Web addresses and e-mails in a text, so the PDF can make them clickable. */
const LINK = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b(?:[\w-]+\.)+(?:com|fr|eu|org|net|io|es|co\.uk)(?:\/[^\s]*)?)/g;

export function splitLinks(text: string): { text: string; href: string | null }[] {
  const out: { text: string; href: string | null }[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    let url = m[0];
    const trail = url.match(/[.,;:!?)» ]+$/)?.[0] ?? "";
    url = url.slice(0, url.length - trail.length);
    const start = m.index!;
    if (start > last) out.push({ text: text.slice(last, start), href: null });
    out.push({ text: url, href: url.includes("@") && !url.startsWith("http") ? `mailto:${url}` : url.startsWith("http") ? url : `https://${url}` });
    last = start + url.length;
  }
  if (last < text.length) out.push({ text: text.slice(last), href: null });
  return out;
}

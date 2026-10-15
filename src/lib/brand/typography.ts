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

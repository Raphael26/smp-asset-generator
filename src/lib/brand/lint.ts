// Brand check: the rules from the guidelines that can be verified without a model.
import type { AssetContent } from "@/lib/content";
import { getLayout } from "@/lib/brand/layouts";
import { plainText } from "@/lib/brand/typography";

export type Severity = "error" | "warning" | "tip";

export type Issue = {
  severity: Severity;
  message: string;
  /** Index of the slide, or null for the caption / the whole asset. */
  slide: number | null;
  field: string | null;
};

const BANNED: { re: RegExp; why: string }[] = [
  { re: /\brévolutionnaire/i, why: "sales cliché" },
  { re: /\bincroyable/i, why: "sales cliché" },
  { re: /\b(le|la|les) meilleur(e|s|es)?\b/i, why: "superlative" },
  { re: /\bexceptionnel(le)?s?\b/i, why: "superlative" },
  { re: /\boptimisation\b/i, why: "jargon: say « organisation »" },
  { re: /\bprocess\b/i, why: "jargon" },
  { re: /\bguéridon/i, why: "rare word that sounds machine-written" },
  { re: /\bécru\b/i, why: "rare word that sounds machine-written" },
  { re: /\bsculptura(l|le|ux)\b/i, why: "rare word that sounds machine-written" },
];

const ACRONYMS = new Set(["INED", "INSEE", "DARES", "OCDE", "OECD", "UNAF", "CNAF", "APEC", "IFOP", "ANACT", "URSSAF", "TVA", "PDF", "RH"]);

const EMOJI = /\p{Extended_Pictographic}/u;

function textRules(text: string, slide: number | null, field: string | null, issues: Issue[]) {
  const t = plainText(text);
  if (!t) return;
  if (EMOJI.test(t)) issues.push({ severity: "error", slide, field, message: "No emoji (rule 10)." });
  if (/!/.test(t.replace(/merci\s*!/gi, ""))) issues.push({ severity: "warning", slide, field, message: "No exclamation marks, except « Merci ! » (rule 10)." });
  if (/\b(nous|notre|nos)\b|l[’']équipe/i.test(t))
    issues.push({ severity: "warning", slide, field, message: "Rebeca speaks in the first person singular: « je », not « nous » or « l’équipe »." });
  for (const b of BANNED) {
    const m = t.match(b.re);
    if (m) issues.push({ severity: "warning", slide, field, message: `« ${m[0]} »: ${b.why}. Prefer everyday words.` });
  }
  const shouting = (t.match(/\b[A-ZÀ-ÖØ-Þ]{4,}\b/g) ?? []).filter((w) => !ACRONYMS.has(w));
  if (shouting.length)
    issues.push({ severity: "warning", slide, field, message: `Capitals for emphasis (« ${shouting[0]} »): use *italic* instead. Eyebrows get their capitals automatically.` });
  if (/spanishmuminparis(?!\.com)|\bSMP\b|spanish mum(?! in paris)|Spanish mum\b/i.test(t) && !/@spanishmuminparis/.test(t)) {
    if (!/Spanish Mum in Paris/.test(t) || /\bSMP\b/.test(t))
      issues.push({ severity: "warning", slide, field, message: "Write the name « Spanish Mum in Paris » (handle: @spanishmuminparis)." });
  }
  if (/creating a home you love/i.test(t) && !/Creating a home you love/.test(t))
    issues.push({ severity: "tip", slide, field, message: "The tagline is always « Creating a home you love. », in English." });
}

export function lintContent(content: AssetContent, opts: { aiMediaIds?: Set<string> } = {}): Issue[] {
  const issues: Issue[] = [];
  content.slides.forEach((slide, i) => {
    const def = getLayout(slide.layout);
    for (const f of def.fields) {
      const value = slide.fields[f.key] ?? "";
      const plain = plainText(value);
      if (!plain) {
        if (!f.optional && f.key !== "eyebrow") issues.push({ severity: "error", slide: i, field: f.key, message: `${f.label} is empty.` });
        continue;
      }
      if (f.kind === "list" || f.kind === "table") {
        const items = plain.split("\n").filter((l) => l.trim());
        const what = f.kind === "table" ? "rows" : "items";
        if (items.length > f.max) issues.push({ severity: "warning", slide: i, field: f.key, message: `${items.length} ${what}: keep it to ${f.max} at most${f.kind === "table" ? ", or split it over two pages" : ""}.` });
      } else if (plain.length > f.max) {
        issues.push({ severity: "warning", slide: i, field: f.key, message: `${f.label}: ${plain.length} characters, aim for ${f.max} or fewer.` });
      }
      textRules(value, i, f.key, issues);
    }
    const title = plainText(slide.fields.title ?? "");
    // Offer names (Room Makeover…) are names, not sentences.
    if (title && slide.layout !== "doc-offer" && !/[.?…»]$/.test(title))
      issues.push({ severity: "tip", slide: i, field: "title", message: "Titles end with a full stop (questions keep their question mark)." });
    if (slide.layout === "figure") {
      const source = plainText(slide.fields.source ?? "");
      if (source && !/\b(19|20)\d{2}\b/.test(source))
        issues.push({ severity: "warning", slide: i, field: "source", message: "Every figure names its source and its year." });
    }
    if (slide.layout === "doc-figures") {
      for (const n of [1, 2, 3]) {
        const value = plainText(slide.fields[`value${n}`] ?? "");
        const source = plainText(slide.fields[`source${n}`] ?? "");
        if (value && !source) issues.push({ severity: "error", slide: i, field: `source${n}`, message: `Figure ${n} needs its source and year.` });
        else if (source && !/\b(19|20)\d{2}\b/.test(source)) issues.push({ severity: "warning", slide: i, field: `source${n}`, message: `Source ${n}: add the year.` });
      }
    }
    if (slide.layout === "doc-table" && /à compléter/i.test(slide.fields.table ?? ""))
      issues.push({ severity: "warning", slide: i, field: "table", message: "Some cells say « à compléter »: fill them in before sending." });
    if (slide.layout === "doc-moodboard" && !(slide.gallery ?? []).some((g) => g.image || g.photoJob))
      issues.push({ severity: "tip", slide: i, field: "gallery", message: "The moodboard has no photos yet." });
    if (slide.layout === "quote") {
      const author = plainText(slide.fields.author ?? "");
      if (author && !/^rebeca$/i.test(author))
        issues.push({ severity: "tip", slide: i, field: "author", message: "Client quotes must be real and approved by the client. Never publish an invented testimonial." });
    }
    if (def.image === "required" && !slide.image) issues.push({ severity: "error", slide: i, field: "image", message: "This template needs a photo." });
    if (slide.image && opts.aiMediaIds?.has(slide.image.mediaId))
      issues.push({ severity: "tip", slide: i, field: "image", message: "AI image: fine for mood, never present it as a client’s home or as Rebeca’s work." });
    if (slide.layout === "cta") {
      const button = plainText(slide.fields.button ?? "");
      if (button && /appel|rendez-vous|rdv/i.test(button) && button !== "Réserver un appel")
        issues.push({ severity: "tip", slide: i, field: "button", message: "The booking button always says « Réserver un appel »." });
    }
  });
  textRules(content.caption, null, "caption", issues);
  return issues;
}

export const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, tip: 2 };

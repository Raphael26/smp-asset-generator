// Slide templates ("modèles"): the slots Rebeca fills in. The look of each one lives in
// src/components/slides/slides.css; this file only describes the fields.
import type { GroundId, LayoutId, Slide } from "@/lib/content";
import { makeId } from "@/lib/content";
import type { Format } from "@/lib/brand/formats";

export type FieldKind = "line" | "title" | "text" | "list";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  /** Soft limit: the brand check warns above it, the slide shrinks the type to fit. */
  max: number;
  optional?: boolean;
  placeholder: string;
  help?: string;
  /** Pre-filled when the slide is created. */
  initial?: string;
};

export type LayoutDef = {
  id: LayoutId;
  name: string;
  description: string;
  fields: FieldDef[];
  image: "none" | "required";
  defaultGround: GroundId;
};

const TITLE_HELP = "Wrap the emotional word in *asterisks* to set it in italic taupe. Press Enter for a line break.";
const TEXT_HELP = "*italic* for emphasis, **bold** for one key phrase.";

const eyebrow = (placeholder: string, optional = true): FieldDef => ({
  key: "eyebrow",
  label: "Eyebrow",
  kind: "line",
  max: 40,
  optional,
  placeholder,
  help: "Short label in small capitals. Type it in normal case: the capitals are automatic.",
});

export const LAYOUTS: LayoutDef[] = [
  {
    id: "cover",
    name: "Title",
    description: "A large title, for a first slide or a single post.",
    image: "none",
    defaultGround: "cream",
    fields: [
      eyebrow("Parentalité & entreprise"),
      { key: "title", label: "Title", kind: "title", max: 80, placeholder: "Pourquoi la parentalité est un *enjeu RH* ?", help: TITLE_HELP },
      { key: "subtitle", label: "Lead", kind: "text", max: 180, optional: true, placeholder: "Une belle maison, c’est aussi une maison bien organisée.", help: TEXT_HELP },
    ],
  },
  {
    id: "figure",
    name: "Key figure",
    description: "One statistic, one sentence, a named and dated source.",
    image: "none",
    defaultGround: "cream",
    fields: [
      eyebrow("Parentalité & entreprise"),
      { key: "title", label: "Title", kind: "title", max: 70, optional: true, placeholder: "Sans équilibre, *on s’en va.*", help: TITLE_HELP },
      { key: "value", label: "Figure", kind: "line", max: 8, placeholder: "+60 %", help: "The number only: +60 %, 40 %, 1 sur 3." },
      { key: "text", label: "Sentence", kind: "text", max: 140, placeholder: "des femmes vivant avec un enfant de moins de 15 ans déclarent une charge mentale lourde.", help: TEXT_HELP },
      { key: "contrast", label: "Contrast line", kind: "line", max: 60, optional: true, placeholder: "Contre 40 % des hommes.", help: "Optional, set in italic." },
      { key: "source", label: "Source", kind: "line", max: 60, placeholder: "INED, 2026", help: "Name and year of a neutral source. « Source : » is added for you." },
    ],
  },
  {
    id: "text",
    name: "Point",
    description: "A numbered idea with a title and a short paragraph.",
    image: "none",
    defaultGround: "cream",
    fields: [
      eyebrow("Mes conseils"),
      { key: "number", label: "Number", kind: "line", max: 3, optional: true, placeholder: "01" },
      { key: "title", label: "Title", kind: "title", max: 70, placeholder: "La lumière. *Puis la table.*", help: TITLE_HELP },
      { key: "body", label: "Text", kind: "text", max: 360, placeholder: "Avant de changer un meuble, regardez d’où vient la lumière et à quel moment de la journée vous vivez dans la pièce.", help: TEXT_HELP + " Leave an empty line between paragraphs." },
    ],
  },
  {
    id: "list",
    name: "List",
    description: "A title and up to six short items.",
    image: "none",
    defaultGround: "cream",
    fields: [
      eyebrow("Ce qui est inclus"),
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Room *Makeover.*", help: TITLE_HELP },
      { key: "items", label: "Items", kind: "list", max: 6, placeholder: "Moodboard\nPalette de couleurs et matériaux\nSuggestions de mobilier\nShopping list avec liens", help: "One item per line, six at most." },
    ],
  },
  {
    id: "quote",
    name: "Quote",
    description: "A sentence of Rebeca’s, or a real client’s with their permission.",
    image: "none",
    defaultGround: "paper",
    fields: [
      { key: "quote", label: "Quote", kind: "text", max: 180, placeholder: "Une maison, c’est un lieu où l’on *se retrouve.*", help: "Quotation marks are added for you. *Italic taupe* for the key words." },
      { key: "author", label: "Signature", kind: "line", max: 40, placeholder: "Rebeca", initial: "Rebeca" },
      { key: "role", label: "Detail", kind: "line", max: 50, optional: true, placeholder: "Spanish Mum in Paris" },
    ],
  },
  {
    id: "photo",
    name: "Photo + title",
    description: "A photo above (or beside) a title and a short text.",
    image: "required",
    defaultGround: "cream",
    fields: [
      eyebrow("01 — Décoration"),
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Un intérieur qui *vous ressemble.*", help: TITLE_HELP },
      { key: "text", label: "Text", kind: "text", max: 160, optional: true, placeholder: "Des intérieurs chaleureux, harmonieux et pensés pour votre façon de vivre.", help: TEXT_HELP },
    ],
  },
  {
    id: "cta",
    name: "Closing",
    description: "The last slide: an invitation and the booking button.",
    image: "none",
    defaultGround: "band",
    fields: [
      { ...eyebrow("Et maintenant ?"), initial: "Et maintenant ?" },
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Parlons de *votre maison.*", initial: "Parlons de *votre maison.*", help: TITLE_HELP },
      { key: "text", label: "Text", kind: "text", max: 160, optional: true, placeholder: "Dites-moi en quelques clics ce qui vous amène : je reviens vers vous avec l’accompagnement le plus adapté.", help: TEXT_HELP },
      { key: "button", label: "Button", kind: "line", max: 32, placeholder: "Réserver un appel", initial: "Réserver un appel", help: "« Réserver un appel » shows the visio icon, as on the site." },
      { key: "url", label: "Link", kind: "line", max: 40, placeholder: "spanishmuminparis.com", initial: "spanishmuminparis.com" },
    ],
  },
];

export function getLayout(id: LayoutId): LayoutDef {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function newSlide(layout: LayoutId, ground?: GroundId): Slide {
  const def = getLayout(layout);
  const fields: Record<string, string> = {};
  for (const f of def.fields) fields[f.key] = f.initial ?? "";
  return { id: makeId(), layout, ground: ground ?? def.defaultGround, fields, image: null };
}

/** Pixel size of the photo frame of a layout, used to generate images at the right shape. */
export function imageFrame(layout: LayoutId, format: Format): { width: number; height: number } | null {
  if (getLayout(layout).image === "none") return null;
  const { width, height, shape } = format;
  switch (shape) {
    case "landscape":
      return { width: Math.round(width * 0.46), height };
    case "square":
      return { width, height: Math.round(height * 0.54) };
    case "story":
      return { width, height: Math.round(height * 0.58) };
    default:
      return { width, height: Math.round(height * 0.6) };
  }
}

// Starting structures offered when creating an asset.
export type Starter = { id: string; name: string; description: string; slides: { layout: LayoutId; ground?: GroundId; fields?: Record<string, string> }[] };

export const CAROUSEL_STARTERS: Starter[] = [
  {
    id: "figures",
    name: "Key figures",
    description: "A question, two figures with their sources, a closing slide.",
    slides: [{ layout: "cover" }, { layout: "figure" }, { layout: "figure" }, { layout: "cta" }],
  },
  {
    id: "tips",
    name: "Tips",
    description: "A title, three numbered points, a closing slide.",
    slides: [
      { layout: "cover" },
      { layout: "text", fields: { number: "01" } },
      { layout: "text", ground: "paper", fields: { number: "02" } },
      { layout: "text", fields: { number: "03" } },
      { layout: "cta" },
    ],
  },
  {
    id: "photo-story",
    name: "Before & after story",
    description: "A title, photos with short captions, a closing slide.",
    slides: [{ layout: "cover" }, { layout: "photo" }, { layout: "photo" }, { layout: "list" }, { layout: "cta" }],
  },
  { id: "blank", name: "Blank", description: "One title slide; add the rest as you go.", slides: [{ layout: "cover" }] },
];

export const SINGLE_STARTERS: Starter[] = [
  { id: "title", name: "Title", description: "A large title and a lead.", slides: [{ layout: "cover" }] },
  { id: "figure", name: "Key figure", description: "One statistic and its source.", slides: [{ layout: "figure" }] },
  { id: "photo", name: "Photo + title", description: "A photo with a title.", slides: [{ layout: "photo" }] },
  { id: "quote", name: "Quote", description: "A sentence in italic.", slides: [{ layout: "quote" }] },
  { id: "list", name: "List", description: "A title and a few items.", slides: [{ layout: "list" }] },
  { id: "cta", name: "Invitation", description: "« Parlons de votre maison. » and the booking button.", slides: [{ layout: "cta" }] },
];

export function slidesFromStarter(starter: Starter): Slide[] {
  return starter.slides.map((s) => {
    const slide = newSlide(s.layout, s.ground);
    if (s.fields) slide.fields = { ...slide.fields, ...s.fields };
    return slide;
  });
}

// Templates ("modèles"): the slots of each slide or document page. The look of each one lives in
// src/components/slides/slides.css and docs.css; this file only describes the fields.
import type { Block, GroundId, LayoutId, Slide } from "@/lib/content";
import { makeId } from "@/lib/content";
import { isDeck, isDocument, type Format } from "@/lib/brand/formats";
import { titleSlideBlocks } from "@/lib/brand/blocks";

export type FieldKind = "line" | "title" | "text" | "list" | "rich" | "table";

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
  image: "none" | "optional" | "required" | "gallery";
  defaultGround: GroundId;
  /** Social formats use social templates; A4 documents use document pages; presentations use the document pages
   *  and the deck templates; the quote works everywhere. */
  kind: "social" | "document" | "deck" | "both";
  /** Laid out by hand in the editor (blocks): Claude never composes it. */
  manual?: boolean;
};

const TITLE_HELP = "Wrap the emotional word in *asterisks* to set it in italic taupe. Press Enter for a line break.";
const TEXT_HELP = "*italic* for emphasis, **bold** for one key phrase.";
const RICH_HELP = "Empty line = new paragraph. « ## » starts a subheading, « - » a bullet, « 1. » a numbered step. *italic*, **bold**.";

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
    kind: "social",
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
    kind: "social",
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
    kind: "social",
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
    kind: "social",
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
    kind: "both",
    fields: [
      { key: "quote", label: "Quote", kind: "text", max: 180, placeholder: "Une maison, c’est un lieu où l’on *se retrouve.*", help: "Quotation marks are added for you. *Italic taupe* for the key words." },
      { key: "author", label: "Signature", kind: "line", max: 40, placeholder: "Rebeca", initial: "Rebeca" },
      { key: "role", label: "Detail", kind: "line", max: 50, optional: true, placeholder: "Spanish Mum in Paris" },
    ],
  },
  {
    id: "photo",
    name: "Photo + title",
    description: "A photo above (or beside) a title and a short text; the photo fills its frame and is cropped to it.",
    image: "required",
    defaultGround: "cream",
    kind: "social",
    fields: [
      eyebrow("01 — Décoration"),
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Un intérieur qui *vous ressemble.*", help: TITLE_HELP },
      { key: "text", label: "Text", kind: "text", max: 160, optional: true, placeholder: "Des intérieurs chaleureux, harmonieux et pensés pour votre façon de vivre.", help: TEXT_HELP },
    ],
  },
  {
    id: "photo-full",
    name: "Full photo + text",
    description: "The whole photo on top, never cropped or zoomed, then a title and a short text on the ground below. The layout follows the photo’s proportions.",
    image: "required",
    defaultGround: "cream",
    kind: "social",
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
    kind: "social",
    fields: [
      { ...eyebrow("Et maintenant ?"), initial: "Et maintenant ?" },
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Parlons de *votre maison.*", initial: "Parlons de *votre maison.*", help: TITLE_HELP },
      { key: "text", label: "Text", kind: "text", max: 160, optional: true, placeholder: "Dites-moi en quelques clics ce qui vous amène : je reviens vers vous avec l’accompagnement le plus adapté.", help: TEXT_HELP },
      { key: "button", label: "Button", kind: "line", max: 32, placeholder: "Réserver un appel", initial: "Réserver un appel", help: "« Réserver un appel » shows the visio icon, as on the site." },
      { key: "url", label: "Link", kind: "line", max: 40, placeholder: "spanishmuminparis.com", initial: "spanishmuminparis.com" },
    ],
  },
  // ——— A4 document pages (guidelines 08: cream page, logo at the top, eyebrow above each title,
  // Fraunces Light titles, Albert Sans text in ink, square tables with hairlines) ———
  {
    id: "doc-cover",
    name: "Cover",
    description: "First page: a large title, an optional photo, who it is for.",
    image: "optional",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("Guide pratique"),
      { key: "title", label: "Title", kind: "title", max: 80, placeholder: "Une entrée rangée, *des matins plus doux.*", help: TITLE_HELP },
      { key: "subtitle", label: "Subtitle", kind: "text", max: 220, optional: true, placeholder: "Cinq idées simples pour organiser l’entrée quand on a des enfants.", help: TEXT_HELP },
      { key: "preparedFor", label: "Prepared for", kind: "line", max: 60, optional: true, placeholder: "Préparé pour Claire et Thomas", help: "For a client or a company. Leave empty for a guide." },
      { key: "date", label: "Date", kind: "line", max: 30, optional: true, placeholder: "Octobre 2026" },
    ],
  },
  {
    id: "doc-page",
    name: "Text page",
    description: "A title and text with subheadings and lists.",
    image: "none",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("01 — L’entrée"),
      { key: "title", label: "Title", kind: "title", max: 70, placeholder: "Tout commence *à la porte.*", help: TITLE_HELP },
      { key: "body", label: "Text", kind: "rich", max: 1800, placeholder: "C’est la première pièce que l’on voit le matin et le soir.\n\n## Ce qui aide\n- Des patères à hauteur d’enfant\n- Un panier par personne\n\n## Par où commencer\n1. Videz tout\n2. Gardez l’essentiel", help: RICH_HELP },
    ],
  },
  {
    id: "doc-photo",
    name: "Photo page",
    description: "A large photo, a title and a short text.",
    image: "required",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("02 — Les rangements"),
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Un panier *par enfant.*", help: TITLE_HELP },
      { key: "body", label: "Text", kind: "rich", max: 900, placeholder: "Chacun range ses affaires dans son panier en rentrant : bonnets, gants, goûter.", help: RICH_HELP },
    ],
  },
  {
    id: "doc-checklist",
    name: "Checklist",
    description: "Boxes to tick: a routine, a list of steps, things to prepare.",
    image: "none",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("À garder sous la main"),
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Ma routine *du soir.*", help: TITLE_HELP },
      { key: "intro", label: "Introduction", kind: "text", max: 240, optional: true, placeholder: "Dix minutes, toute la famille, et le matin est déjà plus simple.", help: TEXT_HELP },
      { key: "items", label: "Boxes", kind: "list", max: 14, placeholder: "Préparer les sacs d’école\nPoser les vêtements du lendemain\nVider le vide-poche\nLancer le lave-vaisselle", help: "One item per line, fourteen at most." },
      { key: "note", label: "Note", kind: "text", max: 160, optional: true, placeholder: "Affichez cette page dans la cuisine." },
    ],
  },
  {
    id: "doc-table",
    name: "Table",
    description: "A table with hairlines: shopping list, planning, comparison.",
    image: "none",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("Shopping list"),
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Pour *votre salon.*", help: TITLE_HELP },
      { key: "intro", label: "Introduction", kind: "text", max: 240, optional: true, placeholder: "Les pièces que je vous propose, avec leurs liens.", help: TEXT_HELP },
      { key: "table", label: "Table", kind: "table", max: 16, placeholder: "Pièce | Où | Prix\nCanapé en lin | Kave Home | 1 290 €\nLampadaire en rotin | Maisons du Monde | 189 €", help: "One row per line, columns separated by |. The first row is the header. Links (https://…) stay clickable in the PDF." },
      { key: "note", label: "Note", kind: "text", max: 200, optional: true, placeholder: "Prix relevés en octobre 2026, à vérifier avant l’achat." },
    ],
  },
  {
    id: "doc-figures",
    name: "Key figures",
    description: "Up to three figures, each with its named and dated source.",
    image: "none",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("Les chiffres"),
      { key: "title", label: "Title", kind: "title", max: 70, placeholder: "La charge mentale *en chiffres.*", help: TITLE_HELP },
      { key: "intro", label: "Introduction", kind: "text", max: 260, optional: true, placeholder: "Ce que disent les études récentes sur l’équilibre des temps de vie.", help: TEXT_HELP },
      { key: "value1", label: "Figure 1", kind: "line", max: 8, placeholder: "+60 %" },
      { key: "text1", label: "Sentence 1", kind: "text", max: 160, placeholder: "des femmes vivant avec un enfant de moins de 15 ans déclarent une charge mentale lourde." },
      { key: "source1", label: "Source 1", kind: "line", max: 60, placeholder: "INED, 2026" },
      { key: "value2", label: "Figure 2", kind: "line", max: 8, optional: true, placeholder: "40 %" },
      { key: "text2", label: "Sentence 2", kind: "text", max: 160, optional: true, placeholder: "des actifs français ont déjà quitté un poste incompatible avec leur vie personnelle." },
      { key: "source2", label: "Source 2", kind: "line", max: 60, optional: true, placeholder: "Randstad Workmonitor, 2026" },
      { key: "value3", label: "Figure 3", kind: "line", max: 8, optional: true, placeholder: "42 %" },
      { key: "text3", label: "Sentence 3", kind: "text", max: 160, optional: true, placeholder: "placent l’équilibre des temps de vie en tête des raisons de rester chez leur employeur." },
      { key: "source3", label: "Source 3", kind: "line", max: 60, optional: true, placeholder: "Randstad Workmonitor, 2026" },
    ],
  },
  {
    id: "doc-offer",
    name: "Offer",
    description: "A formula with its price, what is included and the booking button.",
    image: "none",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("01 — Décoration"),
      { key: "title", label: "Offer name", kind: "title", max: 40, placeholder: "Room Makeover", help: "The offer names stay in English: Déco Express, Room Makeover, Home Routine…" },
      { key: "price", label: "Price", kind: "line", max: 30, placeholder: "350 €", help: "Exactly as in the offers: « 100 € », « À partir de 1 500 € », « Sur devis »." },
      { key: "description", label: "Description", kind: "text", max: 420, placeholder: "Un accompagnement déco pour transformer une pièce et créer un ensemble cohérent.", help: TEXT_HELP },
      { key: "included", label: "What is included", kind: "list", max: 10, placeholder: "Moodboard\nPalette de couleurs et matériaux\nSuggestions de mobilier\nShopping list avec liens\nUn aller-retour de modifications\nÀ distance" },
      { key: "button", label: "Button", kind: "line", max: 32, placeholder: "Réserver un appel", initial: "Réserver un appel" },
      { key: "note", label: "Price note", kind: "line", max: 90, optional: true, placeholder: "Tarifs affichés sans TVA ajoutée.", initial: "Tarifs affichés sans TVA ajoutée." },
    ],
  },
  {
    id: "doc-moodboard",
    name: "Moodboard",
    description: "Up to six photos, the colour palette and the materials.",
    image: "gallery",
    defaultGround: "cream",
    kind: "document",
    fields: [
      eyebrow("Moodboard"),
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Un salon *doux et lumineux.*", help: TITLE_HELP },
      { key: "text", label: "Intention", kind: "text", max: 300, optional: true, placeholder: "Des matières naturelles, une lumière chaude, quelques touches de terracotta.", help: TEXT_HELP },
      { key: "palette", label: "Palette", kind: "line", max: 70, optional: true, placeholder: "#EFE6D8, #D9C3A5, #B6603F, #6B7A5A, #302B27", help: "The project’s colours, as hex codes separated by commas." },
      { key: "materials", label: "Materials", kind: "list", max: 6, optional: true, placeholder: "Lin lavé\nChêne clair\nRotin\nCéramique émaillée" },
    ],
  },
  {
    id: "doc-closing",
    name: "Closing",
    description: "Last page: an invitation, the contacts and Rebeca’s signature.",
    image: "none",
    defaultGround: "band",
    kind: "document",
    fields: [
      { ...eyebrow("Et maintenant ?"), initial: "Et maintenant ?" },
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Parlons de *votre maison.*", initial: "Parlons de *votre maison.*", help: TITLE_HELP },
      { key: "text", label: "Text", kind: "text", max: 300, optional: true, placeholder: "Un appel de vingt minutes suffit pour faire le point et choisir l’accompagnement qui vous convient.", help: TEXT_HELP },
      { key: "contacts", label: "Contacts", kind: "list", max: 5, placeholder: "spanishmuminparis.com", initial: "spanishmuminparis.com\n@spanishmuminparis\nspanishmuminparis@gmail.com\ncalendly.com/spanishmuminparis", help: "One per line; web addresses and the e-mail are clickable in the PDF." },
      { key: "signature", label: "Signature", kind: "line", max: 30, placeholder: "Rebeca", initial: "Rebeca" },
    ],
  },
  // ——— Presentation slides (16:9): the document pages above, plus a section divider and an agenda ———
  {
    id: "deck-section",
    name: "Section",
    description: "A divider between two parts of the deck: a number, a title, one line.",
    image: "none",
    defaultGround: "stone",
    kind: "deck",
    fields: [
      eyebrow("Deuxième partie"),
      { key: "number", label: "Number", kind: "line", max: 3, optional: true, placeholder: "02" },
      { key: "title", label: "Title", kind: "title", max: 60, placeholder: "Ce que la maison *change au travail.*", help: TITLE_HELP },
      { key: "text", label: "Line", kind: "text", max: 160, optional: true, placeholder: "Trois constats, et ce que l’on peut en faire.", help: TEXT_HELP },
    ],
  },
  {
    id: "deck-agenda",
    name: "Agenda",
    description: "The parts of the presentation, numbered.",
    image: "none",
    defaultGround: "cream",
    kind: "deck",
    fields: [
      { ...eyebrow("Au programme"), initial: "Au programme" },
      { key: "title", label: "Title", kind: "title", max: 50, placeholder: "Une heure trente, *en quatre temps.*", help: TITLE_HELP },
      { key: "intro", label: "Introduction", kind: "text", max: 200, optional: true, placeholder: "Ce que je vous propose de voir ensemble.", help: TEXT_HELP },
      { key: "items", label: "Parts", kind: "list", max: 6, placeholder: "Pourquoi la maison pèse sur le travail\nTrois chiffres\nLe programme de l’atelier\nEt maintenant ?", help: "One part per line, six at most. They are numbered for you." },
    ],
  },
  {
    id: "free",
    name: "Blank slide",
    description: "A free canvas: texts, photos, boxes, lines and tables you place and resize yourself.",
    image: "none",
    defaultGround: "cream",
    kind: "deck",
    manual: true,
    fields: [eyebrow("Au programme")],
  },
];

export function getLayout(id: LayoutId): LayoutDef {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function newSlide(layout: LayoutId, ground?: GroundId): Slide {
  const def = getLayout(layout);
  const fields: Record<string, string> = {};
  for (const f of def.fields) fields[f.key] = f.initial ?? "";
  const slide: Slide = { id: makeId(), layout, ground: ground ?? def.defaultGround, fields, image: null };
  if (layout === "free") {
    slide.blocks = [];
    slide.chrome = "page";
  }
  return slide;
}

/** Pixel size of the photo frame of a layout, used to generate images at the right shape. */
export function imageFrame(layout: LayoutId, format: Format): { width: number; height: number } | null {
  const kind = getLayout(layout).image;
  if (kind === "none") return null;
  const { width, height, shape } = format;
  if (shape === "slide") {
    if (kind === "gallery") return galleryFrame();
    // Slides put the photo in one half of the slide, beside the text: the margins (144 px), the gap (96 px) and
    // the header and footer (318 px in all) of docs.css at the deck's 2× zoom.
    return { width: Math.round((width - 2 * 144 - 96) / 2), height: height - 318 };
  }
  if (shape === "a4") {
    // Pages have 64px margins; generated photos are sized at twice the page size for a crisp print.
    if (kind === "gallery") return galleryFrame();
    // Landscape pages put the photo in one half of the page, beside the text, from the header to the footer.
    if (width > height) return { width: Math.round((width - 128 - 48) / 2) * 2, height: (height - 170) * 2 };
    if (layout === "doc-cover") return { width: (width - 128) * 2, height: 400 * 2 };
    return { width: (width - 128) * 2, height: 460 * 2 };
  }
  // The full-photo template shows the photo whole: a generated photo is made at the largest shape that fills
  // its zone edge to edge (see fullPhotoZone), so the layout is the same as the cropped template's.
  if (layout === "photo-full") {
    const zone = fullPhotoZone(format, FULL_PHOTO_DEFAULT_RATIO);
    return { width: zone.photoW, height: zone.photoH };
  }
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

/** One cell of the moodboard grid (two columns, three rows), at print resolution. */
export function galleryFrame() {
  return { width: 660, height: 500 };
}

export const MAX_GALLERY = 6;

// ——— Full photo + text: the photo zone follows the photo ———

/** Share of the slide the photo zone may take (height for portrait shapes, width for landscape ones), and the
 *  slide's margins (slides.css --pad-t / --pad-x), per social shape. */
const FULL_PHOTO: Record<string, { cap: number; padT: number; padX: number }> = {
  portrait: { cap: 0.6, padT: 92, padX: 96 },
  square: { cap: 0.56, padT: 80, padX: 88 },
  story: { cap: 0.55, padT: 250, padX: 96 },
  landscape: { cap: 0.56, padT: 52, padX: 68 },
};

/** Proportions assumed before the photo has loaded, and used to size a generated photo: it fills the zone exactly. */
export const FULL_PHOTO_DEFAULT_RATIO = 1080 / 810;

export type FullPhotoZone = {
  /** The photo sits above the text (portrait, square, story) or beside it (landscape). */
  side: "top" | "left";
  /** Size of the zone the photo takes, text starting right after it. */
  zoneW: number;
  zoneH: number;
  /** Size and position of the photo inside the slide. */
  photoW: number;
  photoH: number;
  x: number;
  y: number;
  /** The photo is narrower than the slide, set in from the edges like a mounted print. */
  inset: boolean;
};

/**
 * Where the whole photo goes on a « Full photo + text » slide, from its width ÷ height ratio. A photo wide enough
 * fills the slide edge to edge and the zone is just as tall as the photo; a taller one is shown smaller, inside
 * the slide's margins, so the text below always keeps its room. Nothing is ever cropped.
 */
export function fullPhotoZone(format: Format, ratio: number): FullPhotoZone {
  const { width: W, height: H } = format;
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : FULL_PHOTO_DEFAULT_RATIO;
  const { cap, padT, padX } = FULL_PHOTO[format.shape] ?? FULL_PHOTO.portrait;
  if (format.shape === "landscape") {
    // Beside the text: full height when the photo is narrow enough, otherwise set in from the top, bottom and left.
    const maxW = Math.round(W * cap);
    if (H * r <= maxW) {
      const photoW = Math.round(H * r);
      return { side: "left", zoneW: photoW, zoneH: H, photoW, photoH: H, x: 0, y: 0, inset: false };
    }
    const photoH = Math.min(H - 2 * padT, Math.round((maxW - padX) / r));
    const photoW = Math.round(photoH * r);
    return { side: "left", zoneW: padX + photoW, zoneH: H, photoW, photoH, x: padX, y: Math.round((H - photoH) / 2), inset: true };
  }
  const maxH = Math.round(H * cap);
  if (W / r <= maxH) {
    const photoH = Math.round(W / r);
    return { side: "top", zoneW: W, zoneH: photoH, photoW: W, photoH, x: 0, y: 0, inset: false };
  }
  const photoH = Math.min(maxH - padT, Math.round((W - 2 * padX) / r));
  const photoW = Math.round(photoH * r);
  return { side: "top", zoneW: W, zoneH: padT + photoH, photoW, photoH, x: Math.round((W - photoW) / 2), y: padT, inset: true };
}

/** Templates available for a format: social ones for social formats, pages for documents, pages and deck slides for presentations. */
export function layoutsFor(format: Format): LayoutDef[] {
  const kinds: LayoutDef["kind"][] = isDocument(format) ? ["document", "both"] : isDeck(format) ? ["document", "deck", "both"] : ["social", "both"];
  return LAYOUTS.filter((l) => kinds.includes(l.kind));
}

/** The closest template of a format, when a slide meets a format it does not belong to. */
export function equivalentLayout(layout: LayoutId, format: Format): LayoutId {
  if (layoutsFor(format).some((l) => l.id === layout)) return layout;
  const toDoc: Partial<Record<LayoutId, LayoutId>> = { cover: "doc-cover", figure: "doc-figures", text: "doc-page", list: "doc-checklist", photo: "doc-photo", "photo-full": "doc-photo", cta: "doc-closing", "deck-section": "doc-page", "deck-agenda": "doc-checklist", free: "doc-page" };
  const toSocial: Partial<Record<LayoutId, LayoutId>> = { "doc-cover": "cover", "doc-figures": "figure", "doc-page": "text", "doc-checklist": "list", "doc-photo": "photo", "doc-closing": "cta", "doc-table": "list", "doc-offer": "list", "doc-moodboard": "photo", "deck-section": "cover", "deck-agenda": "list", free: "text" };
  if (isDocument(format) || isDeck(format)) return toDoc[layout] ?? "doc-page";
  return toSocial[layout] ?? "text";
}

// Starting structures offered when creating an asset.
export type Starter = { id: string; name: string; description: string; slides: { layout: LayoutId; ground?: GroundId; fields?: Record<string, string>; blocks?: Block[] }[] };

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
  { id: "photo", name: "Photo + title", description: "A photo filling the top, cropped to it, with a title.", slides: [{ layout: "photo" }] },
  { id: "photo-full", name: "Full photo + text", description: "The whole photo, never cropped, with a title below.", slides: [{ layout: "photo-full" }] },
  { id: "quote", name: "Quote", description: "A sentence in italic.", slides: [{ layout: "quote" }] },
  { id: "list", name: "List", description: "A title and a few items.", slides: [{ layout: "list" }] },
  { id: "cta", name: "Invitation", description: "« Parlons de votre maison. » and the booking button.", slides: [{ layout: "cta" }] },
];

export const DOCUMENT_STARTERS: Record<string, Starter[]> = {
  "doc-guide": [
    {
      id: "guide",
      name: "Guide",
      description: "Cover, introduction, tips with photos, a checklist, closing page.",
      slides: [{ layout: "doc-cover" }, { layout: "doc-page" }, { layout: "doc-photo" }, { layout: "doc-photo", ground: "paper" }, { layout: "doc-checklist" }, { layout: "doc-closing" }],
    },
    { id: "blank", name: "Blank", description: "A cover; add pages as you go.", slides: [{ layout: "doc-cover" }] },
  ],
  "doc-client": [
    {
      id: "moodboard",
      name: "Moodboard & shopping list",
      description: "Cover, moodboard, shopping list, advice, closing page.",
      slides: [{ layout: "doc-cover" }, { layout: "doc-moodboard" }, { layout: "doc-table" }, { layout: "doc-page" }, { layout: "doc-closing" }],
    },
    {
      id: "routine",
      name: "Home Routine planning",
      description: "Cover, weekly planning table, routines to tick, advice, closing.",
      slides: [{ layout: "doc-cover" }, { layout: "doc-table" }, { layout: "doc-checklist" }, { layout: "doc-page" }, { layout: "doc-closing" }],
    },
    { id: "blank", name: "Blank", description: "A cover; add pages as you go.", slides: [{ layout: "doc-cover" }] },
  ],
  "doc-offer": [
    { id: "one", name: "One formula", description: "The offer page, then the closing page.", slides: [{ layout: "doc-offer" }, { layout: "doc-closing" }] },
    {
      id: "universe",
      name: "A whole universe",
      description: "Cover, one page per formula, closing page.",
      slides: [{ layout: "doc-cover" }, { layout: "doc-offer" }, { layout: "doc-offer", ground: "paper" }, { layout: "doc-offer" }, { layout: "doc-closing" }],
    },
  ],
  "doc-proposal": [
    {
      id: "proposal",
      name: "Workshop proposal",
      description: "Cover, the context, key figures, the programme, the offer, closing.",
      slides: [{ layout: "doc-cover" }, { layout: "doc-page" }, { layout: "doc-figures" }, { layout: "doc-page", ground: "paper" }, { layout: "doc-offer" }, { layout: "doc-closing" }],
    },
    { id: "blank", name: "Blank", description: "A cover; add pages as you go.", slides: [{ layout: "doc-cover" }] },
  ],
};

export const DECK_STARTERS: Record<string, Starter[]> = {
  "deck-corporate": [
    {
      id: "proposal",
      name: "Workshop proposal",
      description: "Cover, agenda, the context, key figures, the programme, the offer, closing.",
      slides: [
        { layout: "doc-cover" },
        { layout: "deck-agenda" },
        { layout: "deck-section", fields: { number: "01" } },
        { layout: "doc-page" },
        { layout: "doc-figures", ground: "paper" },
        { layout: "deck-section", fields: { number: "02" } },
        { layout: "doc-table" },
        { layout: "doc-offer", ground: "paper" },
        { layout: "doc-closing" },
      ],
    },
    {
      id: "workshop",
      name: "The workshop itself",
      description: "Cover, agenda, two parts with advice, a photo and a checklist, a quote, closing.",
      slides: [
        { layout: "doc-cover" },
        { layout: "deck-agenda" },
        { layout: "deck-section", fields: { number: "01" } },
        { layout: "doc-page" },
        { layout: "doc-photo", ground: "paper" },
        { layout: "deck-section", fields: { number: "02" } },
        { layout: "doc-checklist" },
        { layout: "quote", ground: "paper" },
        { layout: "doc-closing" },
      ],
    },
    { id: "blank", name: "Blank", description: "A title slide to lay out yourself; add slides as you go.", slides: [{ layout: "free", blocks: titleSlideBlocks() }] },
  ],
  "deck-client": [
    {
      id: "project",
      name: "Project presentation",
      description: "Cover, the intention, moodboard, a photo, shopping list, next steps, closing.",
      slides: [
        { layout: "doc-cover" },
        { layout: "doc-page" },
        { layout: "doc-moodboard" },
        { layout: "doc-photo", ground: "paper" },
        { layout: "doc-table" },
        { layout: "doc-page", ground: "paper" },
        { layout: "doc-closing" },
      ],
    },
    { id: "blank", name: "Blank", description: "A title slide to lay out yourself; add slides as you go.", slides: [{ layout: "free", blocks: titleSlideBlocks() }] },
  ],
};

export function startersFor(format: Format): Starter[] {
  if (isDocument(format)) return DOCUMENT_STARTERS[format.landscapeOf ?? format.id] ?? DOCUMENT_STARTERS["doc-guide"];
  if (isDeck(format)) return DECK_STARTERS[format.id] ?? DECK_STARTERS["deck-corporate"];
  return format.multi ? CAROUSEL_STARTERS : SINGLE_STARTERS;
}

export function slidesFromStarter(starter: Starter): Slide[] {
  return starter.slides.map((s) => {
    const slide = newSlide(s.layout, s.ground);
    if (s.fields) slide.fields = { ...slide.fields, ...s.fields };
    if (s.blocks) slide.blocks = s.blocks.map((b) => ({ ...b, id: makeId() }));
    return slide;
  });
}

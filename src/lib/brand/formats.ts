// Output formats. Adding one = adding an entry here (the templates adapt to its shape).

/** The shape sets the templates and their sizes: social shapes, A4 document pages, 16:9 presentation slides. */
export type Shape = "portrait" | "square" | "story" | "landscape" | "a4" | "slide";

export type Format = {
  id: string;
  platform: "LinkedIn" | "Instagram" | "Facebook" | "Document" | "Presentation";
  name: string;
  width: number;
  height: number;
  shape: Shape;
  /** Several slides (carousel) or a single image. */
  multi: boolean;
  maxSlides: number;
  /** LinkedIn carousels are uploaded as a PDF document, presentations as PowerPoint; everything else as images. */
  primaryExport: "pdf" | "png" | "pptx";
  hint: string;
  /** Landscape A4 documents: the id of the same document in portrait. */
  landscapeOf?: string;
};

export const FORMATS: Format[] = [
  {
    id: "linkedin-carousel",
    platform: "LinkedIn",
    name: "Carousel",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: true,
    maxSlides: 20,
    primaryExport: "pdf",
    hint: "Uploaded as a PDF document, one page per slide.",
  },
  {
    id: "linkedin-post",
    platform: "LinkedIn",
    name: "Post · portrait",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Takes the most room in the feed.",
  },
  {
    id: "linkedin-post-square",
    platform: "LinkedIn",
    name: "Post · square",
    width: 1080,
    height: 1080,
    shape: "square",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Safe everywhere.",
  },
  {
    id: "linkedin-post-landscape",
    platform: "LinkedIn",
    name: "Post · landscape",
    width: 1200,
    height: 627,
    shape: "landscape",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Same shape as a link preview.",
  },
  {
    id: "instagram-post",
    platform: "Instagram",
    name: "Post · 4:5",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Standard portrait post.",
  },
  {
    id: "instagram-square",
    platform: "Instagram",
    name: "Post · square",
    width: 1080,
    height: 1080,
    shape: "square",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Classic square post.",
  },
  {
    id: "instagram-carousel",
    platform: "Instagram",
    name: "Carousel",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: true,
    maxSlides: 20,
    primaryExport: "png",
    hint: "One image per slide, uploaded together.",
  },
  {
    id: "instagram-story",
    platform: "Instagram",
    name: "Story",
    width: 1080,
    height: 1920,
    shape: "story",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Keep text out of the top and bottom 250px.",
  },
  {
    id: "facebook-post",
    platform: "Facebook",
    name: "Post · 4:5",
    width: 1080,
    height: 1350,
    shape: "portrait",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Portrait post.",
  },
  {
    id: "facebook-landscape",
    platform: "Facebook",
    name: "Post · landscape",
    width: 1200,
    height: 630,
    shape: "landscape",
    multi: false,
    maxSlides: 1,
    primaryExport: "png",
    hint: "Same shape as a link preview.",
  },
  // A4 documents: 794 × 1123 px is A4 at 96 px per inch; exported as a real PDF (selectable text, clickable links).
  {
    id: "doc-guide",
    platform: "Document",
    name: "Guide",
    width: 794,
    height: 1123,
    shape: "a4",
    multi: true,
    maxSlides: 24,
    primaryExport: "pdf",
    hint: "A guide or lead magnet to share as a PDF: tips, steps, a checklist.",
  },
  {
    id: "doc-client",
    platform: "Document",
    name: "Client document",
    width: 794,
    height: 1123,
    shape: "a4",
    multi: true,
    maxSlides: 24,
    primaryExport: "pdf",
    hint: "For one client: moodboard, shopping list, Home Routine planning, Home Manual.",
  },
  {
    id: "doc-offer",
    platform: "Document",
    name: "Offer sheet",
    width: 794,
    height: 1123,
    shape: "a4",
    multi: true,
    maxSlides: 8,
    primaryExport: "pdf",
    hint: "One or two pages presenting a universe or a formula, with prices.",
  },
  {
    id: "doc-proposal",
    platform: "Document",
    name: "Corporate proposal",
    width: 794,
    height: 1123,
    shape: "a4",
    multi: true,
    maxSlides: 16,
    primaryExport: "pdf",
    hint: "For a company: Home & Life Balance workshops, key figures, programme, price.",
  },
  // Presentations: 16:9 slides (1920 × 1080) laid out with the document pages drawn twice as large, plus a
  // section divider and an agenda. Exported as PowerPoint (one image per slide, with speaker notes) or PDF.
  {
    id: "deck-corporate",
    platform: "Presentation",
    name: "Corporate deck",
    width: 1920,
    height: 1080,
    shape: "slide",
    multi: true,
    maxSlides: 30,
    primaryExport: "pptx",
    hint: "To present to a company: a workshop proposal, the Home & Life Balance workshop itself, a talk.",
  },
  {
    id: "deck-client",
    platform: "Presentation",
    name: "Client presentation",
    width: 1920,
    height: 1080,
    shape: "slide",
    multi: true,
    maxSlides: 30,
    primaryExport: "pptx",
    hint: "To present a project to a client: the intention, the moodboard, the pieces, the next steps.",
  },
];

export const isDocument = (f: Format) => f.shape === "a4";
/** 16:9 presentations: laid out with the document pages (and the deck-… templates), exported as PowerPoint. */
export const isDeck = (f: Format) => f.shape === "slide";
/** Posts, carousels and stories: the social templates. */
export const isSocial = (f: Format) => !isDocument(f) && !isDeck(f);
/** Design units of a presentation slide: docs.css draws a 960 × 540 page zoomed ×2 into the 1920 × 1080 slide.
 *  Free blocks are placed in these units. */
export const DECK_DESIGN = { width: 960, height: 540, zoom: 2 } as const;
export const isLandscape = (f: Format) => f.width > f.height;

// Every A4 document also exists in landscape (1123 × 794), as « <id>-landscape »: the same pages, with
// the photos beside the text. The pickers list the portrait ones and offer the orientation next to them.
export const LANDSCAPE_DOCUMENTS: Format[] = FORMATS.filter(isDocument).map((f) => ({ ...f, id: `${f.id}-landscape`, width: f.height, height: f.width, landscapeOf: f.id }));

/** Every format, landscape documents included. */
export const ALL_FORMATS: Format[] = [...FORMATS, ...LANDSCAPE_DOCUMENTS];

export function getFormat(id: string): Format {
  return ALL_FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}

/** The same A4 document in portrait or in landscape; social formats have a single shape. */
export function withOrientation(f: Format, landscape: boolean): Format {
  if (!isDocument(f)) return f;
  const portrait = f.landscapeOf ?? f.id;
  return getFormat(landscape ? `${portrait}-landscape` : portrait);
}

export const PLATFORMS = ["LinkedIn", "Instagram", "Facebook", "Document", "Presentation"] as const;

/** « LinkedIn carousel », « Instagram story », « Client document · A4 PDF », « Guide · A4 landscape PDF », « Corporate deck · 16:9 slides ». */
export const formatLabel = (f: Format) =>
  isDocument(f) ? `${f.name} · A4 ${isLandscape(f) ? "landscape " : ""}PDF` : isDeck(f) ? `${f.name} · 16:9 slides` : `${f.platform} ${f.name.toLowerCase()}`;
/** What the parts of an asset are called: slides for social formats, pages for documents. */
export const unitName = (f: Format, plural = false) => (isDocument(f) ? (plural ? "pages" : "page") : plural ? "slides" : "slide");

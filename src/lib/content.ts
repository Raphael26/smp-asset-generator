// The editable content of an asset. Stored as JSON in assets.content.

export type GroundId = "cream" | "paper" | "stone" | "band";
export type UniverseId = "decoration" | "organisation" | "entreprises";
export type LayoutId =
  | "cover"
  | "figure"
  | "text"
  | "list"
  | "quote"
  | "photo"
  | "photo-full"
  | "cta"
  | "doc-cover"
  | "doc-page"
  | "doc-photo"
  | "doc-checklist"
  | "doc-table"
  | "doc-figures"
  | "doc-offer"
  | "doc-moodboard"
  | "doc-closing"
  | "deck-section"
  | "deck-agenda"
  | "free";

/** One photo of a moodboard grid, possibly still being generated. */
export type GalleryItem = { image: ImageRef | null; photoJob?: string | null; photoPrompt?: string | null };

export type ImageRef = {
  mediaId: string;
  /** Focal point in percent, used as CSS object-position. */
  focusX: number;
  focusY: number;
  /** 1 = cover the frame; up to 2 zooms in on the focal point. */
  zoom: number;
};

export type Slide = {
  id: string;
  layout: LayoutId;
  ground: GroundId;
  fields: Record<string, string>;
  image: ImageRef | null;
  /** The English prompt the photo was (or is being) generated from. */
  photoPrompt?: string | null;
  /** Replicate job generating this slide's photo; cleared when the photo arrives. */
  photoJob?: string | null;
  /** Moodboard photos. */
  gallery?: GalleryItem[];
  /** Presentations: what Rebeca says on this slide. Not drawn on the slide; exported as the PowerPoint notes. */
  notes?: string | null;
  /** Free slides (layout « free »): the blocks Rebeca placed herself, painted in order, in the slide's design units (960 × 540 for a deck). */
  blocks?: Block[];
  /** Free slides: the logo and the running footer drawn around the blocks. */
  chrome?: SlideChrome;
};

// ——— Free slides: blocks placed by hand (presentations) ———

/** The brand's type presets for a text block; their look lives in docs.css, their sizes in src/lib/brand/blocks.ts. */
export type BlockStyle = "cover-title" | "title" | "lead" | "body" | "eyebrow" | "small" | "figure" | "price" | "quote" | "signature" | "tagline" | "button";
export type BoxFill = "paper" | "cream" | "stone" | "band" | "sable" | "sauge" | "blush" | "ink";
export type SlideChrome = "page" | "cover" | "closing" | "none";

type BlockBase = { id: string; x: number; y: number; w: number; h: number };
export type TextBlock = BlockBase & {
  type: "text";
  /** Same markup as the fields: *italic*, **bold**, « ## » subheadings, « - » bullets, « 1. » steps. */
  text: string;
  style: BlockStyle;
  /** Percent of the preset's size. */
  size: number;
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "bottom";
  columns?: 1 | 2;
};
export type ImageBlock = BlockBase & { type: "image"; image: ImageRef | null };
export type BoxBlock = BlockBase & { type: "box"; fill: BoxFill; accent: boolean };
/** A hairline: horizontal when wider than tall. */
export type LineBlock = BlockBase & { type: "line"; strong: boolean };
export type TableBlock = BlockBase & { type: "table"; rows: string };
export type Block = TextBlock | ImageBlock | BoxBlock | LineBlock | TableBlock;

export type LogoMode = "wordmark" | "monogram" | "none";

export type AssetOptions = {
  logo: LogoMode;
  /** "1 / 5" in the footer of multi-slide assets. */
  pageNumbers: boolean;
  /** « Glissez → » on every slide but the last of a carousel. */
  swipeHint: boolean;
  /** Universe tag (tinted chip) on the first slide. */
  universeTag: boolean;
};

export type AssetContent = {
  slides: Slide[];
  caption: string;
  options: AssetOptions;
};

export const DEFAULT_OPTIONS: AssetOptions = {
  logo: "wordmark",
  pageNumbers: false,
  swipeHint: true,
  universeTag: false,
};

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

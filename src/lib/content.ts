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
  | "cta"
  | "doc-cover"
  | "doc-page"
  | "doc-photo"
  | "doc-checklist"
  | "doc-table"
  | "doc-figures"
  | "doc-offer"
  | "doc-moodboard"
  | "doc-closing";

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
};

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

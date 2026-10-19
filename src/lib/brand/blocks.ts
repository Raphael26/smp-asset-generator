// Free slides (presentations): the blocks Rebeca places herself. Positions and sizes are in the slide's
// design units (DECK_DESIGN: 960 × 540, drawn twice as large); the text presets are the brand's type
// styles, drawn by docs.css.
import type { Block, BlockStyle, BoxFill, TextBlock } from "@/lib/content";
import { makeId } from "@/lib/content";
import { DECK_DESIGN } from "@/lib/brand/formats";
import { COLORS } from "@/lib/brand/tokens";

/** The margins of a slide in docs.css: guides when a block is moved. */
export const SLIDE_MARGIN = { x: 72, top: 40, bottom: 28 };

export const BLOCK_STYLES: { id: BlockStyle; label: string; size: number; serif: boolean }[] = [
  { id: "cover-title", label: "Large title", size: 48, serif: true },
  { id: "title", label: "Title", size: 38, serif: true },
  { id: "lead", label: "Lead", size: 16.5, serif: false },
  { id: "body", label: "Text", size: 14.5, serif: false },
  { id: "eyebrow", label: "Eyebrow", size: 10, serif: false },
  { id: "small", label: "Small print", size: 10.5, serif: false },
  { id: "figure", label: "Key figure", size: 52, serif: true },
  { id: "price", label: "Price", size: 30, serif: true },
  { id: "quote", label: "Quote", size: 38, serif: true },
  { id: "signature", label: "Signature", size: 30, serif: true },
  { id: "tagline", label: "Tagline", size: 14, serif: true },
  { id: "button", label: "Button", size: 10, serif: false },
];

export function blockStyle(id: BlockStyle) {
  return BLOCK_STYLES.find((s) => s.id === id) ?? BLOCK_STYLES[3];
}

/** Font size of a text block, in design units. */
export const textSize = (b: TextBlock) => (blockStyle(b.style).size * b.size) / 100;

export const BOX_FILLS: { id: BoxFill; label: string; hex: string }[] = [
  { id: "paper", label: "Paper", hex: COLORS.paper },
  { id: "cream", label: "Cream", hex: COLORS.cream },
  { id: "stone", label: "Stone", hex: COLORS.stone },
  { id: "band", label: "Band", hex: COLORS.band },
  { id: "sable", label: "Sable", hex: COLORS.sable },
  { id: "sauge", label: "Sauge", hex: COLORS.sauge },
  { id: "blush", label: "Blush", hex: COLORS.blush },
  { id: "ink", label: "Ink", hex: COLORS.ink },
];

export const fillHex = (id: BoxFill) => BOX_FILLS.find((f) => f.id === id)?.hex ?? COLORS.paper;

export const MIN_BLOCK = { w: 24, h: 10 };

const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

/** A new block of a type, with a sensible size, placed at `at` or near the top-left of the text area. */
export function newBlock(type: Block["type"], at?: { x: number; y: number }): Block {
  const id = makeId();
  const p = at ?? { x: SLIDE_MARGIN.x, y: 120 };
  switch (type) {
    case "text":
      return { id, type, ...rect(p.x, p.y, 420, 60), text: "", style: "body", size: 100, align: "left", valign: "top" };
    case "image":
      return { id, type, ...rect(p.x, p.y, 300, 200), image: null };
    case "box":
      return { id, type, ...rect(p.x, p.y, 300, 160), fill: "stone", accent: false };
    case "line":
      return { id, type, ...rect(p.x, p.y, 300, 1), strong: false };
    case "table":
      return { id, type, ...rect(p.x, p.y, 600, 160), rows: "Colonne | Colonne | Colonne\nLigne | à compléter | à compléter" };
  }
}

export function textBlock(style: BlockStyle, text: string, r: { x: number; y: number; w: number; h: number }, extra: Partial<Omit<TextBlock, "id" | "type">> = {}): TextBlock {
  return { id: makeId(), type: "text", text, style, size: 100, align: "left", valign: "top", ...r, ...extra };
}

/** What a blank presentation starts with: a title slide to fill in, like a presentation app. */
export function titleSlideBlocks(): Block[] {
  return [textBlock("eyebrow", "", rect(72, 150, 500, 20)), textBlock("cover-title", "", rect(72, 180, 640, 160)), textBlock("lead", "", rect(72, 352, 520, 60))];
}

/** Keeps a block on the slide and above the minimum size, with whole-unit coordinates. */
export function clampBlock<B extends Block>(b: B): B {
  const w = Math.round(Math.max(MIN_BLOCK.w, Math.min(b.w, DECK_DESIGN.width)));
  const h = Math.round(Math.max(b.type === "line" ? 1 : MIN_BLOCK.h, Math.min(b.h, DECK_DESIGN.height)));
  const x = Math.round(Math.max(24 - w, Math.min(b.x, DECK_DESIGN.width - 24)));
  const y = Math.round(Math.max(12 - h, Math.min(b.y, DECK_DESIGN.height - 12)));
  return { ...b, x, y, w, h };
}

/** The text of a block, for the brand check and for Claude. */
export function blockText(b: Block): string {
  return b.type === "text" ? b.text : b.type === "table" ? b.rows : "";
}

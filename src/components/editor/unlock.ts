// « Unlock »: turns the rendered template slide (the editor's preview) into a free slide. Every text,
// photo, box and table the template drew becomes a block at the place and size it was drawn, so the
// slide looks the same and can then be moved around.
import type { Block, BlockStyle, BoxFill, Slide, TextBlock } from "@/lib/content";
import { makeId } from "@/lib/content";
import { DECK_DESIGN } from "@/lib/brand/formats";
import { clampBlock } from "@/lib/brand/blocks";

export function unlockSlide(root: HTMLElement, slide: Slide): Slide {
  const inner = root.querySelector<HTMLElement>(".smp-inner");
  if (!inner) return slide;
  const ir = inner.getBoundingClientRect();
  const k = ir.width / DECK_DESIGN.width;
  // The template may have shrunk its type to fit: the blocks keep that size.
  const fit = Number(root.dataset.fit ?? "1") || 1;
  const blocks: Block[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-free]")) {
    const r = el.getBoundingClientRect();
    const rect = { x: (r.left - ir.left) / k, y: (r.top - ir.top) / k, w: r.width / k, h: r.height / k };
    const id = makeId();
    switch (el.dataset.free) {
      case "text": {
        const text = el.dataset.freeText ?? "";
        if (!text.trim()) continue;
        const cs = getComputedStyle(el);
        const align = cs.textAlign === "center" ? "center" : cs.textAlign === "right" || cs.textAlign === "end" ? "right" : "left";
        const b: TextBlock = {
          id,
          type: "text",
          text,
          style: (el.dataset.freeStyle as BlockStyle) ?? "body",
          size: Math.round(Number(el.dataset.freeSize ?? 100) * fit),
          align,
          valign: "top",
          ...rect,
          w: rect.w + 2,
          h: rect.h + 4,
          ...(cs.columnCount === "2" ? { columns: 2 as const } : {}),
        };
        blocks.push(clampBlock(b));
        break;
      }
      case "image": {
        const i = Number(el.dataset.freeIndex ?? -1);
        if (i >= 0 && !slide.gallery?.[i]) continue;
        blocks.push(clampBlock({ id, type: "image", image: i < 0 ? slide.image : (slide.gallery?.[i]?.image ?? null), ...rect }));
        break;
      }
      case "box":
        blocks.push(clampBlock({ id, type: "box", fill: (el.dataset.freeFill as BoxFill) ?? "paper", accent: el.dataset.freeAccent === "true", ...rect }));
        break;
      case "table": {
        const rows = el.dataset.freeText ?? "";
        if (!rows.trim()) continue;
        blocks.push(clampBlock({ id, type: "table", rows, ...rect, h: rect.h + 4 }));
        break;
      }
    }
  }
  const chrome = root.classList.contains("doc-cover") ? "cover" : root.classList.contains("doc-closing") ? "closing" : "page";
  return { ...slide, layout: "free", fields: { eyebrow: chrome === "page" ? (slide.fields.eyebrow ?? "") : "" }, blocks, chrome, image: null, photoJob: null, photoPrompt: null, gallery: undefined };
}

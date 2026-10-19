"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import type { Block, BlockStyle, Slide, TextBlock } from "@/lib/content";
import { DECK_DESIGN } from "@/lib/brand/formats";
import { blockStyle, clampBlock, MIN_BLOCK, SLIDE_MARGIN, textSize } from "@/lib/brand/blocks";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: { id: Handle; cursor: string; x: number; y: number }[] = [
  { id: "nw", cursor: "nwse-resize", x: 0, y: 0 },
  { id: "n", cursor: "ns-resize", x: 0.5, y: 0 },
  { id: "ne", cursor: "nesw-resize", x: 1, y: 0 },
  { id: "e", cursor: "ew-resize", x: 1, y: 0.5 },
  { id: "se", cursor: "nwse-resize", x: 1, y: 1 },
  { id: "s", cursor: "ns-resize", x: 0.5, y: 1 },
  { id: "sw", cursor: "nesw-resize", x: 0, y: 1 },
  { id: "w", cursor: "ew-resize", x: 0, y: 0.5 },
];
const handlesFor = (b: Block) => (b.type === "line" ? HANDLES.filter((h) => (b.h > b.w ? h.id === "n" || h.id === "s" : h.id === "e" || h.id === "w")) : HANDLES);

const SNAP = 4;

/** Snaps a moved block to the margins, the centre of the slide and the edges of the other blocks. */
function snapMove(b: Block, others: Block[]): { x: number; y: number; gx: number[]; gy: number[] } {
  const xs = [SLIDE_MARGIN.x, DECK_DESIGN.width / 2, DECK_DESIGN.width - SLIDE_MARGIN.x, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
  const ys = [SLIDE_MARGIN.top, DECK_DESIGN.height / 2, DECK_DESIGN.height - SLIDE_MARGIN.bottom, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
  const pick = (edges: [number, number][], candidates: number[]) => {
    let best: { d: number; v: number; g: number } | null = null;
    for (const [edge, off] of edges)
      for (const c of candidates) {
        const d = Math.abs(edge - c);
        if (d <= SNAP && (!best || d < best.d)) best = { d, v: c - off, g: c };
      }
    return best;
  };
  const sx = pick(
    [
      [b.x, 0],
      [b.x + b.w / 2, b.w / 2],
      [b.x + b.w, b.w],
    ],
    xs,
  );
  const sy = pick(
    [
      [b.y, 0],
      [b.y + b.h / 2, b.h / 2],
      [b.y + b.h, b.h],
    ],
    ys,
  );
  return { x: sx ? sx.v : b.x, y: sy ? sy.v : b.y, gx: sx ? [sx.g] : [], gy: sy ? [sy.g] : [] };
}

function resize(o: Block, h: Handle, dx: number, dy: number): Block {
  let { x, y, w, h: hh } = o;
  const minW = MIN_BLOCK.w;
  const minH = o.type === "line" ? 1 : MIN_BLOCK.h;
  if (h.includes("e")) w = Math.max(minW, o.w + dx);
  if (h.includes("s")) hh = Math.max(minH, o.h + dy);
  if (h.includes("w")) {
    const nx = Math.min(o.x + dx, o.x + o.w - minW);
    w = o.x + o.w - nx;
    x = nx;
  }
  if (h.includes("n")) {
    const ny = Math.min(o.y + dy, o.y + o.h - minH);
    hh = o.y + o.h - ny;
    y = ny;
  }
  return { ...o, x, y, w, h: hh };
}

const INK = "#302b27";
const EDIT_STYLE: Record<BlockStyle, CSSProperties> = {
  "cover-title": { lineHeight: 1.04, letterSpacing: "-.025em" },
  title: { lineHeight: 1.06, letterSpacing: "-.02em" },
  lead: { lineHeight: 1.5, fontWeight: 300, color: "#4d453f" },
  body: { lineHeight: 1.55 },
  eyebrow: { lineHeight: 1.4, fontWeight: 600, letterSpacing: ".24em", textTransform: "uppercase", color: "#6f6054" },
  small: { lineHeight: 1.45, color: "#75695f" },
  figure: { lineHeight: 1, letterSpacing: "-.02em", color: "#8a6e5b" },
  price: { lineHeight: 1.1, color: "#8a6e5b" },
  quote: { lineHeight: 1.25, fontStyle: "italic", letterSpacing: "-.01em" },
  signature: { lineHeight: 1.1, fontStyle: "italic", color: "#76675b" },
  tagline: { lineHeight: 1.3, fontStyle: "italic", color: "#76675b" },
  button: { lineHeight: 1.6, letterSpacing: ".13em", textTransform: "uppercase" },
};

/** The text box drawn over a block being typed: the same font, size and colour as the block. */
function editStyle(b: TextBlock, k: number): CSSProperties {
  const serif = blockStyle(b.style).serif;
  return {
    position: "absolute",
    left: b.x * k,
    top: b.y * k,
    width: b.w * k,
    height: b.h * k,
    fontFamily: serif ? '"Fraunces", Georgia, serif' : '"Albert Sans", Arial, sans-serif',
    fontWeight: serif ? 300 : 400,
    fontVariationSettings: serif ? '"opsz" 144' : undefined,
    fontSize: textSize(b) * k,
    color: INK,
    textAlign: b.align,
    background: "transparent",
    border: 0,
    outline: "none",
    padding: 0,
    margin: 0,
    resize: "none",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    ...EDIT_STYLE[b.style],
  };
}

/**
 * The editing layer over a free slide: select, drag, resize, double-click to type. Positions are in the
 * slide's design units; `scale` is the stage's screen pixels per slide pixel.
 */
export function FreeCanvas({
  slide,
  scale,
  selected,
  onSelect,
  onChange,
  editing,
  onEditing,
  onPickImage,
}: {
  slide: Slide;
  scale: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (fn: (s: Slide) => Slide) => void;
  /** The text block being typed in; the stage opens a block just added at once. */
  editing: string | null;
  onEditing: (id: string | null) => void;
  onPickImage: (id: string) => void;
}) {
  const k = scale * DECK_DESIGN.zoom;
  const blocks = slide.blocks ?? [];
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  // What is typed, kept with its block: until typing starts, the text box shows the block's text.
  const [typed, setTyped] = useState<{ id: string | null; text: string }>({ id: null, text: "" });
  const drag = useRef<null | { id: string; mode: "move" | "resize"; handle?: Handle; sx: number; sy: number; orig: Block; moved: boolean }>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const editingBlock = blocks.find((b): b is TextBlock => b.id === editing && b.type === "text") ?? null;
  const draft = editingBlock && typed.id === editingBlock.id ? typed.text : (editingBlock?.text ?? "");
  const setDraft = (text: string) => editingBlock && setTyped({ id: editingBlock.id, text });

  const startEdit = (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || b.type !== "text") return;
    onSelect(id);
    onEditing(id);
  };
  const commitEdit = () => {
    if (!editingBlock) return;
    if (draft !== editingBlock.text) {
      const id = editingBlock.id;
      onChange((s) => ({ ...s, blocks: (s.blocks ?? []).map((b) => (b.id === id && b.type === "text" ? { ...b, text: draft } : b)) }));
    }
    setTyped({ id: null, text: "" });
    onEditing(null);
  };

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const down = (e: RPointerEvent, b: Block, mode: "move" | "resize", handle?: Handle) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (editing === b.id && mode === "move") return;
    if (editing) commitEdit();
    onSelect(b.id);
    drag.current = { id: b.id, mode, handle, sx: e.clientX, sy: e.clientY, orig: b, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / k;
    const dy = (e.clientY - d.sy) / k;
    if (!d.moved) {
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      d.moved = true;
    }
    const others = blocks.filter((b) => b.id !== d.id);
    let next: Block;
    let gx: number[] = [];
    let gy: number[] = [];
    if (d.mode === "move") {
      const moved = { ...d.orig, x: d.orig.x + dx, y: d.orig.y + dy };
      if (e.altKey) next = moved;
      else {
        const s = snapMove(moved, others);
        next = { ...moved, x: s.x, y: s.y };
        gx = s.gx;
        gy = s.gy;
      }
    } else {
      next = resize(d.orig, d.handle!, dx, dy);
    }
    next = clampBlock(next);
    setGuides({ x: gx, y: gy });
    onChange((s) => ({ ...s, blocks: (s.blocks ?? []).map((b) => (b.id === next.id ? next : b)) }));
  };
  const up = () => {
    drag.current = null;
    setGuides({ x: [], y: [] });
  };

  // Wraps the selection of the text box in * or ** (⌘I, ⌘B), like the fields.
  const wrap = (mark: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    if (a === b) return;
    const next = draft.slice(0, a) + mark + draft.slice(a, b) + mark + draft.slice(b);
    setDraft(next);
    requestAnimationFrame(() => el.setSelectionRange(a + mark.length, b + mark.length));
  };

  return (
    <div
      className="absolute inset-0"
      onPointerDown={() => {
        if (editing) commitEdit();
        onSelect(null);
      }}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {blocks.map((b) => {
        const sel = b.id === selected;
        const style: CSSProperties = { position: "absolute", left: b.x * k, top: b.y * k, width: Math.max(b.w * k, 6), height: Math.max(b.h * k, 6), cursor: "move", touchAction: "none" };
        return (
          <div
            key={b.id}
            style={style}
            className={sel ? "outline outline-1 outline-ink" : "hover:outline hover:outline-1 hover:outline-rule"}
            onPointerDown={(e) => down(e, b, "move")}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (b.type === "text") startEdit(b.id);
              else if (b.type === "image") onPickImage(b.id);
            }}
          >
            {sel &&
              editing !== b.id &&
              handlesFor(b).map((h) => (
                <div
                  key={h.id}
                  className="absolute h-2 w-2 border border-ink bg-paper"
                  style={{ left: `calc(${h.x * 100}% - 4px)`, top: `calc(${h.y * 100}% - 4px)`, cursor: h.cursor }}
                  onPointerDown={(e) => down(e, b, "resize", h.id)}
                />
              ))}
          </div>
        );
      })}
      {guides.x.map((x) => (
        <div key={`x${x}`} className="pointer-events-none absolute top-0 bottom-0 w-px bg-taupe-logo" style={{ left: x * k }} />
      ))}
      {guides.y.map((y) => (
        <div key={`y${y}`} className="pointer-events-none absolute right-0 left-0 h-px bg-taupe-logo" style={{ top: y * k }} />
      ))}
      {editingBlock && (
        <textarea
          ref={area}
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              commitEdit();
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
              e.preventDefault();
              wrap("*");
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
              e.preventDefault();
              wrap("**");
            }
          }}
          style={editStyle(editingBlock, k)}
        />
      )}
    </div>
  );
}

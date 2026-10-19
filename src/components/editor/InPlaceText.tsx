"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import type { Slide } from "@/lib/content";
import { getLayout } from "@/lib/brand/layouts";

type Box = { left: number; top: number; width: number; height: number };
type Editing = { key: string; style: CSSProperties; draft: string };

/** Screen pixels per computed-style pixel of an element: the slide is scaled (and zoomed), and computed lengths
 *  come in the same convention as its computed width, so the ratio of its drawn width to that width is exact.
 *  Inline elements have no computed width: the nearest block ancestor shares their zoom. */
function factorOf(el: HTMLElement): number {
  for (let e: HTMLElement | null = el; e; e = e.parentElement) {
    const w = parseFloat(getComputedStyle(e).width);
    if (w > 0) return e.getBoundingClientRect().width / w;
  }
  return 1;
}

/** Copies the look of a rendered text onto the text box drawn over it. */
function styleOf(el: HTMLElement, rect: DOMRect, origin: DOMRect): CSSProperties {
  const cs = getComputedStyle(el);
  const k = factorOf(el);
  const px = (v: string) => (v.endsWith("px") ? parseFloat(v) * k : undefined);
  return {
    position: "absolute",
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    width: rect.width,
    minHeight: rect.height,
    fontFamily: cs.fontFamily,
    fontSize: px(cs.fontSize),
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    fontVariationSettings: cs.fontVariationSettings,
    letterSpacing: px(cs.letterSpacing),
    // A bare number would be a multiplier of the font size: the unit matters here.
    lineHeight: px(cs.lineHeight) !== undefined ? `${px(cs.lineHeight)}px` : cs.lineHeight,
    textTransform: cs.textTransform as CSSProperties["textTransform"],
    textAlign: cs.textAlign as CSSProperties["textAlign"],
    color: cs.color,
    paddingTop: px(cs.paddingTop),
    paddingRight: px(cs.paddingRight),
    paddingBottom: px(cs.paddingBottom),
    paddingLeft: px(cs.paddingLeft),
    background: cs.backgroundColor,
    border: 0,
    outline: "none",
    margin: 0,
    resize: "none",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    boxSizing: "border-box",
  };
}

/**
 * Typing on a template slide: every text the template draws carries its field name (data-field); a click on
 * one opens a text box right over it, in the same type, bound to that field. The slide's own text is hidden
 * meanwhile and comes back typeset when the box closes.
 */
export function InPlaceText({ slide, onChange }: { slide: Slide; onChange: (fields: Record<string, string>) => void }) {
  const overlay = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  // The slide's element hidden under the text box, put back when the box closes.
  const hidden = useRef<HTMLElement | null>(null);
  const [hover, setHover] = useState<{ key: string; box: Box } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const def = getLayout(slide.layout);

  // The field under the pointer, in the slide beneath the overlay.
  const targetAt = (x: number, y: number) => {
    const o = overlay.current;
    if (!o) return null;
    for (const e of document.elementsFromPoint(x, y)) {
      if (e === o || o.contains(e) || !o.parentElement?.contains(e)) continue;
      const el = (e as HTMLElement).closest<HTMLElement>("[data-field]");
      if (el) return { key: el.dataset.field!, el, rect: el.getBoundingClientRect(), origin: o.getBoundingClientRect() };
    }
    return null;
  };

  const show = () => {
    if (hidden.current) hidden.current.style.visibility = "";
    hidden.current = null;
  };
  const commit = () => {
    if (!editing) return;
    show();
    if (editing.draft !== (slide.fields[editing.key] ?? "")) onChange({ [editing.key]: editing.draft });
    setEditing(null);
  };

  // The hidden text comes back if the box goes away for another reason (another slide, a template change).
  useEffect(() => {
    const el = hidden.current;
    return () => {
      if (el) el.style.visibility = "";
    };
  }, [editing?.key]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = `${el.scrollHeight}px`;
  }, [editing?.key]);

  const onMove = (e: RPointerEvent) => {
    if (editing) return;
    const t = targetAt(e.clientX, e.clientY);
    if (!t) return setHover((h) => (h ? null : h));
    const box = { left: t.rect.left - t.origin.left, top: t.rect.top - t.origin.top, width: t.rect.width, height: t.rect.height };
    setHover((h) => (h && h.key === t.key && h.box.left === box.left && h.box.top === box.top && h.box.width === box.width ? h : { key: t.key, box }));
  };

  const onDown = (e: RPointerEvent) => {
    if (e.button !== 0) return;
    if (editing) commit();
    const t = targetAt(e.clientX, e.clientY);
    if (!t) return;
    e.preventDefault();
    const style = styleOf(t.el, t.rect, t.origin);
    t.el.style.visibility = "hidden";
    hidden.current = t.el;
    setHover(null);
    setEditing({ key: t.key, style, draft: slide.fields[t.key] ?? "" });
  };

  // Wraps the selection in * or ** (⌘I, ⌘B), like the fields.
  const wrap = (mark: string) => {
    const el = area.current;
    if (!el || !editing) return;
    const { selectionStart: a, selectionEnd: b } = el;
    if (a === b) return;
    const d = editing.draft;
    setEditing({ ...editing, draft: d.slice(0, a) + mark + d.slice(a, b) + mark + d.slice(b) });
    requestAnimationFrame(() => el.setSelectionRange(a + mark.length, b + mark.length));
  };

  const field = editing ? def.fields.find((f) => f.key === editing.key) : undefined;

  return (
    <div ref={overlay} className="absolute inset-0" style={{ cursor: hover ? "text" : "default" }} onPointerMove={onMove} onPointerLeave={() => setHover(null)} onPointerDown={onDown}>
      {hover && !editing && (
        <div
          className="pointer-events-none absolute border border-dashed border-taupe-logo"
          style={{ left: hover.box.left - 3, top: hover.box.top - 3, width: hover.box.width + 6, height: hover.box.height + 6 }}
        />
      )}
      {editing && (
        <textarea
          ref={area}
          value={editing.draft}
          placeholder={field?.placeholder}
          spellCheck={false}
          onChange={(e) => {
            setEditing({ ...editing, draft: e.target.value });
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={commit}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              commit();
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
          style={editing.style}
        />
      )}
    </div>
  );
}

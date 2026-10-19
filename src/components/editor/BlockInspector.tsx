"use client";

import type { Block, BlockStyle, BoxFill } from "@/lib/content";
import { BLOCK_STYLES, BOX_FILLS } from "@/lib/brand/blocks";
import { FieldInput } from "./FieldInput";
import { Icon } from "@/components/ui/Icon";

const NAMES: Record<Block["type"], string> = { text: "Text", image: "Photo", box: "Box", line: "Line", table: "Table" };

/** The selected block of a free slide: its style, its content, its place. */
export function BlockInspector({
  block: b,
  index,
  onChange,
  onDelete,
  onDuplicate,
  onOrder,
  onPickImage,
}: {
  block: Block;
  index: number;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOrder: (dir: 1 | -1) => void;
  onPickImage: () => void;
}) {
  const num = (key: "x" | "y" | "w" | "h", label: string) => (
    <label className="flex items-center justify-between gap-2 text-[12px] text-ink-soft">
      {label}
      <input type="number" className="field w-[76px] px-2 py-1 text-[12.5px]" value={Math.round(b[key])} onChange={(e) => onChange({ ...b, [key]: Number(e.target.value) || 0 })} />
    </label>
  );
  const chips = <T extends string>(value: T, items: [T, string][], set: (v: T) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([id, label]) => (
        <button key={id} className="chip" aria-pressed={value === id} onClick={() => set(id)}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <section className="border border-ink bg-cream/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="label mb-0">Block · {NAMES[b.type]}</p>
        <div className="flex gap-0.5">
          <button className="btn btn-ghost btn-sm" title="Send backward (⌘[)" onClick={() => onOrder(-1)}>
            <Icon name="down" size={13} />
          </button>
          <button className="btn btn-ghost btn-sm" title="Bring forward (⌘])" onClick={() => onOrder(1)}>
            <Icon name="up" size={13} />
          </button>
          <button className="btn btn-ghost btn-sm" title="Duplicate (⌘D)" onClick={onDuplicate}>
            <Icon name="copy" size={13} />
          </button>
          <button className="btn btn-ghost btn-sm" title="Delete (⌫)" onClick={onDelete}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {b.type === "text" && (
          <>
            <div>
              <label className="label" htmlFor={`block-style-${index}`}>
                Style
              </label>
              <select id={`block-style-${index}`} className="field" value={b.style} onChange={(e) => onChange({ ...b, style: e.target.value as BlockStyle })}>
                {BLOCK_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="grid grid-cols-[56px_1fr_44px] items-center gap-2 text-[12px] text-ink-soft">
              Size
              <input type="range" min={50} max={250} step={5} value={b.size} onChange={(e) => onChange({ ...b, size: Number(e.target.value) })} className="accent-ink" />
              <span className="text-right tabular-nums text-muted">{b.size} %</span>
            </label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {chips(
                b.align,
                [
                  ["left", "Left"],
                  ["center", "Centre"],
                  ["right", "Right"],
                ],
                (align) => onChange({ ...b, align }),
              )}
              {chips(
                b.valign,
                [
                  ["top", "Top"],
                  ["middle", "Middle"],
                  ["bottom", "Bottom"],
                ],
                (valign) => onChange({ ...b, valign }),
              )}
            </div>
            <label className="flex items-center gap-2.5 text-[13px]">
              <input type="checkbox" className="accent-ink" checked={b.columns === 2} onChange={(e) => onChange({ ...b, columns: e.target.checked ? 2 : 1 })} />
              Two columns
            </label>
            <FieldInput
              id={`block-text-${index}`}
              def={{
                key: "text",
                label: "Text",
                kind: "rich",
                max: 600,
                placeholder: "Double-click the block on the slide to type there, or write here.",
                help: "Empty line = new paragraph. « ## » starts a subheading, « - » a bullet, « 1. » a numbered step. *italic*, **bold**.",
              }}
              value={b.text}
              onChange={(text) => onChange({ ...b, text })}
            />
          </>
        )}

        {b.type === "image" && (
          <div>
            {b.image ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/media/${b.image.mediaId}/file?w=300`} alt="" className="h-[72px] w-[72px] border border-line object-cover" />
                  <div className="flex gap-1 self-end">
                    <button className="btn btn-outline btn-sm" onClick={onPickImage}>
                      Change
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...b, image: null })}>
                      Remove
                    </button>
                  </div>
                </div>
                {[
                  { key: "focusX" as const, label: "Left ↔ right", min: 0, max: 100, step: 1 },
                  { key: "focusY" as const, label: "Top ↕ bottom", min: 0, max: 100, step: 1 },
                  { key: "zoom" as const, label: "Zoom", min: 1, max: 2, step: 0.01 },
                ].map((c) => (
                  <label key={c.key} className="grid grid-cols-[96px_1fr_36px] items-center gap-2 text-[12px] text-ink-soft">
                    {c.label}
                    <input
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={b.image![c.key]}
                      onChange={(e) => onChange({ ...b, image: { ...b.image!, [c.key]: Number(e.target.value) } })}
                      className="accent-ink"
                    />
                    <span className="text-right tabular-nums text-muted">{c.key === "zoom" ? `${Math.round(b.image![c.key] * 100)}%` : b.image![c.key]}</span>
                  </label>
                ))}
              </div>
            ) : (
              <button onClick={onPickImage} className="flex h-[84px] w-full flex-col items-center justify-center gap-2 border border-dashed border-rule text-[13px] text-ink-soft hover:bg-paper">
                <Icon name="image" size={20} />
                Choose, upload or generate a photo
              </button>
            )}
          </div>
        )}

        {b.type === "box" && (
          <>
            <div>
              <p className="label">Fill</p>
              <div className="flex flex-wrap gap-2">
                {BOX_FILLS.map((f) => (
                  <button
                    key={f.id}
                    title={f.label}
                    onClick={() => onChange({ ...b, fill: f.id as BoxFill })}
                    className={`h-8 w-10 border ${b.fill === f.id ? "border-ink outline-1 outline-offset-2 outline-ink" : "border-line"}`}
                    style={{ background: f.hex }}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-[13px]">
              <input type="checkbox" className="accent-ink" checked={b.accent} onChange={(e) => onChange({ ...b, accent: e.target.checked })} />
              Taupe rule on the left
            </label>
          </>
        )}

        {b.type === "line" && (
          <label className="flex items-center gap-2.5 text-[13px]">
            <input type="checkbox" className="accent-ink" checked={b.strong} onChange={(e) => onChange({ ...b, strong: e.target.checked })} />
            Stronger rule
          </label>
        )}

        {b.type === "table" && (
          <FieldInput
            id={`block-table-${index}`}
            def={{
              key: "rows",
              label: "Rows",
              kind: "table",
              max: 8,
              placeholder: "Pièce | Où | Prix\nCanapé en lin | Kave Home | 1 290 €",
              help: "One row per line, columns separated by |. The first row is the header.",
            }}
            value={b.rows}
            onChange={(rows) => onChange({ ...b, rows })}
          />
        )}

        <div>
          <p className="label">Place and size</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {num("x", "Left")}
            {num("y", "Top")}
            {num("w", "Width")}
            {num("h", "Height")}
          </div>
          <p className="mt-1.5 text-[11.5px] text-muted">In slide units (the slide is 960 × 540). Arrow keys nudge the block; hold Shift for 10.</p>
        </div>
      </div>
    </section>
  );
}

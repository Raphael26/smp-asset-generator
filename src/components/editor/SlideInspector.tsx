"use client";

import type { Media } from "@/lib/db/schema";
import type { LayoutId, Slide } from "@/lib/content";
import { LAYOUTS, getLayout, newSlide } from "@/lib/brand/layouts";
import { GROUNDS } from "@/lib/brand/tokens";
import { FieldInput } from "./FieldInput";
import { Icon } from "@/components/ui/Icon";

export function SlideInspector({
  slide,
  index,
  media,
  onChange,
  onPickImage,
  onNewPhoto,
}: {
  slide: Slide;
  index: number;
  media: Media[];
  onChange: (s: Slide) => void;
  onPickImage: () => void;
  /** Generate a new photo for this slide from a prompt (Claude's, possibly edited). */
  onNewPhoto: (prompt: string) => void;
}) {
  const def = getLayout(slide.layout);
  const image = slide.image ? media.find((m) => m.id === slide.image!.mediaId) : null;

  const changeLayout = (layout: LayoutId) => {
    if (layout === slide.layout) return;
    // Keep what was written in fields the new template also has.
    const fresh = newSlide(layout, slide.ground);
    const fields = { ...fresh.fields };
    for (const k of Object.keys(fields)) if (slide.fields[k]?.trim()) fields[k] = slide.fields[k];
    if (!fields.body && slide.fields.text && "body" in fields) fields.body = slide.fields.text;
    if (!fields.text && slide.fields.body && "text" in fields) fields.text = slide.fields.body;
    onChange({ ...slide, layout, fields, image: getLayout(layout).image === "none" ? null : slide.image });
  };

  const setImage = (patch: Partial<NonNullable<Slide["image"]>>) => slide.image && onChange({ ...slide, image: { ...slide.image, ...patch } });

  return (
    <div className="flex flex-col gap-7">
      <section>
        <p className="label">Template</p>
        <div className="grid grid-cols-2 gap-1.5">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => changeLayout(l.id)}
              title={l.description}
              className={`border px-3 py-2 text-left text-[13px] transition-colors ${slide.layout === l.id ? "border-ink bg-cream" : "border-line hover:border-rule"}`}
            >
              {l.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-snug text-muted">{def.description}</p>
      </section>

      <section>
        <p className="label">Ground</p>
        <div className="flex gap-2">
          {GROUNDS.map((g) => (
            <button
              key={g.id}
              onClick={() => onChange({ ...slide, ground: g.id })}
              title={`${g.label}: ${g.use}`}
              className={`flex flex-col items-center gap-1 text-[11px] ${slide.ground === g.id ? "text-ink" : "text-muted"}`}
            >
              <span className={`block h-9 w-12 border ${slide.ground === g.id ? "border-ink outline-1 outline-offset-2 outline-ink" : "border-line"}`} style={{ background: g.hex }} />
              {g.label}
            </button>
          ))}
        </div>
      </section>

      {def.image === "required" && (
        <section>
          <p className="label">Photo</p>
          {slide.photoJob && (
            <p className="anim-pulse mb-3 border border-line bg-cream px-3 py-2.5 text-[12.5px] text-taupe">Generating the photo… it appears in the slide in about 30 seconds.</p>
          )}
          {slide.image ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${slide.image.mediaId}/file?w=300`} alt="" className="h-[84px] w-[84px] border border-line object-cover" />
                <div className="flex min-w-0 flex-col justify-between">
                  <div>
                    <p className="truncate text-[13px]">{image?.label || "Photo"}</p>
                    {image && (
                      <span className={`tag mt-1 ${image.isAi ? "bg-blush text-flag" : "bg-sauge text-sauge-ink"}`}>{image.isAi ? "AI image" : "Real photo"}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-outline btn-sm" onClick={onPickImage}>
                      Change
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...slide, image: null })}>
                      Remove
                    </button>
                  </div>
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
                    value={slide.image![c.key]}
                    onChange={(e) => setImage({ [c.key]: Number(e.target.value) })}
                    className="accent-ink"
                  />
                  <span className="text-right tabular-nums text-muted">{c.key === "zoom" ? `${Math.round(slide.image![c.key] * 100)}%` : slide.image![c.key]}</span>
                </label>
              ))}
              <p className="text-[11.5px] text-muted">Faces sit well around 50 % across and 15–30 % from the top.</p>
            </div>
          ) : (
            <button onClick={onPickImage} className="flex h-[96px] w-full flex-col items-center justify-center gap-2 border border-dashed border-rule text-[13px] text-ink-soft hover:bg-cream">
              <Icon name="image" size={20} />
              Choose, upload or generate a photo
            </button>
          )}
          {slide.photoPrompt && (
            <details className="mt-3 border-t border-line pt-3">
              <summary className="cursor-pointer text-[12.5px] text-taupe">Photo prompt</summary>
              <textarea
                className="field mt-2 text-[12.5px]"
                rows={5}
                value={slide.photoPrompt}
                onChange={(e) => onChange({ ...slide, photoPrompt: e.target.value })}
              />
              <button className="btn btn-outline btn-sm mt-2" disabled={Boolean(slide.photoJob)} onClick={() => onNewPhoto(slide.photoPrompt ?? "")}>
                <Icon name="wand" size={14} /> New photo from this prompt · $0.10
              </button>
            </details>
          )}
        </section>
      )}

      <section className="flex flex-col gap-5">
        {def.fields.map((f) => (
          <FieldInput
            key={`${slide.id}-${f.key}`}
            id={`field-${index}-${f.key}`}
            def={f}
            value={slide.fields[f.key] ?? ""}
            onChange={(v) => onChange({ ...slide, fields: { ...slide.fields, [f.key]: v } })}
          />
        ))}
      </section>
    </div>
  );
}

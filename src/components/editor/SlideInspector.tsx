"use client";

import { useState } from "react";
import type { Media } from "@/lib/db/schema";
import type { LayoutId, Slide } from "@/lib/content";
import { MAX_GALLERY, getLayout, layoutsFor, newSlide } from "@/lib/brand/layouts";
import type { Format } from "@/lib/brand/formats";
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
  format,
  onPickGallery,
  onNewGalleryPhoto,
}: {
  slide: Slide;
  index: number;
  media: Media[];
  onChange: (s: Slide) => void;
  onPickImage: () => void;
  /** Generate a new photo for this slide from a prompt (Claude's, possibly edited). */
  onNewPhoto: (prompt: string) => void;
  format: Format;
  /** Open the picker to add photos to the moodboard. */
  onPickGallery: () => void;
  /** Generate the photo Claude described for one cell of the moodboard. */
  onNewGalleryPhoto: (index: number, prompt: string) => void;
}) {
  const def = getLayout(slide.layout);
  const image = slide.image ? media.find((m) => m.id === slide.image!.mediaId) : null;
  // A photo Claude described but nobody generated yet: show its prompt and button straight away.
  const [promptOpen] = useState(() => !slide.image && !slide.photoJob);

  const changeLayout = (layout: LayoutId) => {
    if (layout === slide.layout) return;
    // Keep what was written in fields the new template also has.
    const fresh = newSlide(layout, slide.ground);
    const fields = { ...fresh.fields };
    for (const k of Object.keys(fields)) if (slide.fields[k]?.trim()) fields[k] = slide.fields[k];
    if (!fields.body && slide.fields.text && "body" in fields) fields.body = slide.fields.text;
    if (!fields.text && slide.fields.body && "text" in fields) fields.text = slide.fields.body;
    const kind = getLayout(layout).image;
    onChange({ ...slide, layout, fields, image: kind === "none" || kind === "gallery" ? null : slide.image, gallery: kind === "gallery" ? (slide.gallery ?? []) : slide.gallery });
  };

  const setImage = (patch: Partial<NonNullable<Slide["image"]>>) => slide.image && onChange({ ...slide, image: { ...slide.image, ...patch } });

  return (
    <div className="flex flex-col gap-7">
      <section>
        <p className="label">Template</p>
        <div className="grid grid-cols-2 gap-1.5">
          {layoutsFor(format).map((l) => (
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

      {def.image === "gallery" && (
        <section>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="label mb-0">Moodboard photos</p>
            <span className="text-[11px] text-muted tabular-nums">
              {(slide.gallery ?? []).length}/{MAX_GALLERY}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(slide.gallery ?? []).map((g, gi) => (
              <div key={gi} className="group relative aspect-square border border-line bg-stone">
                {g.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${g.image.mediaId}/file?w=240`} alt="" className="h-full w-full object-cover" />
                ) : g.photoJob ? (
                  <span className="anim-pulse flex h-full items-center justify-center p-1 text-center text-[11px] text-taupe">Generating…</span>
                ) : g.photoPrompt ? (
                  <button className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center text-[11px] text-ink-soft hover:bg-cream" title={g.photoPrompt} onClick={() => onNewGalleryPhoto(gi, g.photoPrompt ?? "")}>
                    <Icon name="wand" size={14} />
                    Generate this photo · $0.10
                  </button>
                ) : null}
                <button
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center bg-paper/90 text-taupe opacity-0 group-hover:opacity-100 hover:text-ink"
                  title="Remove"
                  onClick={() => onChange({ ...slide, gallery: (slide.gallery ?? []).filter((_, j) => j !== gi) })}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
            {(slide.gallery ?? []).length < MAX_GALLERY && (
              <button onClick={onPickGallery} className="flex aspect-square flex-col items-center justify-center gap-1 border border-dashed border-rule text-[11.5px] text-ink-soft hover:bg-cream">
                <Icon name="plus" size={16} />
                Add a photo
              </button>
            )}
          </div>
          <p className="mt-2 text-[11.5px] text-muted">Two columns; with three or five photos, the first one is tall.</p>
        </section>
      )}

      {(def.image === "required" || def.image === "optional") && (
        <section>
          <p className="label">Photo{def.image === "optional" && <span className="ml-1.5 font-normal tracking-normal normal-case text-muted">optional</span>}</p>
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
            <details className="mt-3 border-t border-line pt-3" open={promptOpen}>
              <summary className="cursor-pointer text-[12.5px] text-taupe">Photo prompt</summary>
              <textarea
                className="field mt-2 text-[12.5px]"
                rows={5}
                value={slide.photoPrompt}
                onChange={(e) => onChange({ ...slide, photoPrompt: e.target.value })}
              />
              <button className="btn btn-outline btn-sm mt-2" disabled={Boolean(slide.photoJob)} onClick={() => onNewPhoto(slide.photoPrompt ?? "")}>
                <Icon name="wand" size={14} /> {slide.image ? "New photo from this prompt" : "Generate this photo"} · $0.10
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

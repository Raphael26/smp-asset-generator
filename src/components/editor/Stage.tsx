"use client";

import { useEffect, useRef, useState } from "react";
import type { Asset } from "@/lib/db/schema";
import type { Slide } from "@/lib/content";
import type { Issue } from "@/lib/brand/lint";
import { getFormat, isDeck, isDocument, isLandscape, unitName } from "@/lib/brand/formats";
import { getLayout } from "@/lib/brand/layouts";
import { ScaledSlide, previewUrl } from "@/components/slides/ScaledSlide";
import { OrientationChoice } from "@/components/studio/OrientationChoice";
import { Icon } from "@/components/ui/Icon";
import { FreeCanvas } from "./FreeCanvas";
import { InPlaceText } from "./InPlaceText";

export function Stage({
  asset,
  current,
  setCurrent,
  issues,
  onFit,
  onIssue,
  onOrientation,
  selectedBlock,
  onSelectBlock,
  onChangeSlide,
  onSnapshot,
  editRequest,
  onEditDone,
  onPickBlockImage,
}: {
  asset: Asset;
  current: number;
  setCurrent: (i: number) => void;
  issues: Issue[];
  onFit: (slideId: string, overflow: boolean) => void;
  onIssue: (i: Issue) => void;
  onOrientation: (landscape: boolean) => void;
  /** Free slides: the selected block and the editing callbacks of the canvas. */
  selectedBlock: string | null;
  onSelectBlock: (id: string | null) => void;
  onChangeSlide: (fn: (s: Slide) => Slide) => void;
  onSnapshot: () => void;
  editRequest: string | null;
  onEditDone: () => void;
  onPickBlockImage: (id: string) => void;
}) {
  const format = getFormat(asset.formatId);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });
  // The text block being typed in (free slides), remembered with its slide so a change of slide ends the typing;
  // a block just added (editRequest) opens for typing at once.
  const [editingFor, setEditingFor] = useState<{ slideId: string | undefined; id: string | null }>({ slideId: undefined, id: null });
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const slide = asset.content.slides[current];
  const total = asset.content.slides.length;
  const width = Math.max(200, Math.min(size.w - 48, ((size.h - 24) * format.width) / format.height));
  const scale = width / format.width;
  const free = Boolean(slide && slide.layout === "free" && isDeck(format));
  const slideId = slide?.id;
  const editing = (editingFor.slideId === slideId ? editingFor.id : null) ?? editRequest;
  const setEditing = (id: string | null) => {
    setEditingFor({ slideId, id });
    if (id === null && editRequest) onEditDone();
  };
  const mine = issues.filter((i) => i.slide === current);
  const unit = unitName(format);
  // On a free slide the arrows nudge a selected block, so the hint names the keys that always turn the slide.
  const keys = total > 1 ? ` · ${free ? "Page ↑ ↓" : "← →"} change ${unit}` : "";

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-stone/60">
      <div ref={box} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
        {slide && (
          <div id="stage-slide" className="relative" style={{ width, height: (width * format.height) / format.width }}>
            <ScaledSlide
              width={width}
              format={format}
              slide={slide}
              index={current}
              total={total}
              universeId={asset.universe}
              options={asset.content.options}
              mediaUrl={previewUrl(1600)}
              placeholders
              title={asset.title}
              hiddenBlock={free ? editing : null}
              onFit={(r) => onFit(slide.id, r.overflow)}
              className="shadow-[0_18px_50px_-24px_rgba(48,43,39,.45)]"
            />
            {!free && <InPlaceText key={slide.id} slide={slide} onChange={(fields) => onChangeSlide((s) => ({ ...s, fields: { ...s.fields, ...fields } }))} />}
            {free && (
              <FreeCanvas
                slide={slide}
                scale={scale}
                selected={selectedBlock}
                onSelect={onSelectBlock}
                onChange={onChangeSlide}
                onSnapshot={onSnapshot}
                editing={editing}
                onEditing={setEditing}
                onPickImage={onPickBlockImage}
              />
            )}
          </div>
        )}
      </div>
      <div className="flex min-h-[64px] items-start justify-between gap-6 border-t border-line bg-paper/70 px-6 py-3">
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {total > 1 && (
            <button className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => setCurrent(current - 1)} aria-label={`Previous ${unit}`} title={`Previous ${unit} · ← or Page ↑`}>
              <Icon name="chevronLeft" size={16} />
            </button>
          )}
          <span className="whitespace-nowrap text-[12.5px] text-ink-soft">
            {total > 1 ? `${unitName(format) === "page" ? "Page" : "Slide"} ${current + 1} of ${total} · ` : ""}
            {slide ? getLayout(slide.layout).name : ""} · {format.shape === "a4" ? (isLandscape(format) ? "A4 landscape" : "A4") : isDeck(format) ? "16:9 slide" : `${format.width} × ${format.height}`}
          </span>
          {total > 1 && (
            <button className="btn btn-ghost btn-sm" disabled={current === total - 1} onClick={() => setCurrent(current + 1)} aria-label={`Next ${unit}`} title={`Next ${unit} · → or Page ↓`}>
              <Icon name="chevronRight" size={16} />
            </button>
          )}
          {/* Under the page itself, so it is in view whichever inspector tab is open. */}
          {isDocument(format) && (
            <div className="ml-3">
              <OrientationChoice landscape={isLandscape(format)} onChange={onOrientation} />
            </div>
          )}
          <span className="ml-3 hidden text-[11.5px] text-muted xl:inline">{(free ? "Drag to move · double-click a text to type · ⌫ delete · ⌘Z undo · ⌥ drag without snapping" : "Click a text to change it on the slide") + keys}</span>
        </div>
        <ul className="flex max-w-[60%] flex-col items-end gap-1">
          {mine.slice(0, 3).map((i, k) => (
            <li key={k}>
              <button onClick={() => onIssue(i)} className={`flex items-start gap-1.5 text-right text-[12px] leading-snug ${i.severity === "error" ? "text-flag" : i.severity === "warning" ? "text-taupe" : "text-muted"}`}>
                <Icon name={i.severity === "tip" ? "info" : "alert"} size={13} className="mt-0.5 shrink-0" />
                {i.message}
              </button>
            </li>
          ))}
          {mine.length > 3 && <li className="text-[12px] text-muted">+{mine.length - 3} more in the brand check</li>}
        </ul>
      </div>
    </div>
  );
}

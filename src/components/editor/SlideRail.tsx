"use client";

import { useState } from "react";
import type { Asset } from "@/lib/db/schema";
import type { LayoutId } from "@/lib/content";
import { getFormat } from "@/lib/brand/formats";
import { LAYOUTS, getLayout } from "@/lib/brand/layouts";
import { ScaledSlide, previewUrl } from "@/components/slides/ScaledSlide";
import { Icon } from "@/components/ui/Icon";

export function SlideRail({
  asset,
  current,
  setCurrent,
  onAdd,
  onMove,
  onDuplicate,
  onDelete,
  onFit,
  issueCount,
}: {
  asset: Asset;
  current: number;
  setCurrent: (i: number) => void;
  onAdd: (layout: LayoutId) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onFit: (slideId: string, overflow: boolean) => void;
  issueCount: (i: number) => number;
}) {
  const format = getFormat(asset.formatId);
  const slides = asset.content.slides;
  const [menu, setMenu] = useState(false);
  const thumbW = 128;

  return (
    <div className="scroll-thin flex w-[184px] shrink-0 flex-col overflow-y-auto border-r border-line bg-paper">
      <div className="flex flex-col gap-4 p-4">
        {slides.map((s, i) => (
          <div key={s.id} className="group relative">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
              <span className={current === i ? "font-semibold text-ink" : ""}>
                {i + 1} · {getLayout(s.layout).name}
              </span>
              {issueCount(i) > 0 && <span className="h-1.5 w-1.5 rounded-full bg-flag" title="Something to fix on this slide" />}
            </div>
            <button
              onClick={() => setCurrent(i)}
              className={`block border ${current === i ? "border-ink outline-1 outline-offset-2 outline-ink" : "border-line hover:border-rule"}`}
            >
              <ScaledSlide
                width={thumbW}
                format={format}
                slide={s}
                index={i}
                total={slides.length}
                universeId={asset.universe}
                options={asset.content.options}
                mediaUrl={previewUrl(300)}
                placeholders
                onFit={(r) => onFit(s.id, r.overflow)}
              />
            </button>
            <div className="absolute top-6 -right-1 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {[
                { icon: "up" as const, title: "Move up", on: () => onMove(i, -1), off: i === 0 },
                { icon: "down" as const, title: "Move down", on: () => onMove(i, 1), off: i === slides.length - 1 },
                { icon: "copy" as const, title: "Duplicate", on: () => onDuplicate(i), off: slides.length >= format.maxSlides },
                { icon: "trash" as const, title: "Delete", on: () => onDelete(i), off: slides.length <= 1 },
              ].map((b) => (
                <button key={b.title} title={b.title} disabled={b.off} onClick={b.on} className="flex h-7 w-7 items-center justify-center border border-line bg-paper text-taupe hover:text-ink disabled:opacity-30">
                  <Icon name={b.icon} size={13} />
                </button>
              ))}
            </div>
          </div>
        ))}
        {slides.length < format.maxSlides && (
          <div className="relative">
            <button className="btn btn-outline btn-sm w-full" onClick={() => setMenu((m) => !m)}>
              <Icon name="plus" size={14} /> Add slide
            </button>
            {menu && (
              <div className="anim-rise absolute bottom-10 left-0 z-20 w-[220px] border border-line bg-paper py-1 shadow-[0_12px_30px_-14px_rgba(48,43,39,.4)]">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    className="block w-full px-4 py-2 text-left text-[13px] hover:bg-cream"
                    onClick={() => {
                      onAdd(l.id);
                      setMenu(false);
                    }}
                  >
                    {l.name}
                    <span className="block text-[11.5px] text-muted">{l.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

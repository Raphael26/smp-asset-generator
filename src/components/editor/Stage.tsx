"use client";

import { useEffect, useRef, useState } from "react";
import type { Asset } from "@/lib/db/schema";
import type { Issue } from "@/lib/brand/lint";
import { getFormat, isLandscape, unitName } from "@/lib/brand/formats";
import { getLayout } from "@/lib/brand/layouts";
import { ScaledSlide, previewUrl } from "@/components/slides/ScaledSlide";
import { Icon } from "@/components/ui/Icon";

export function Stage({
  asset,
  current,
  setCurrent,
  issues,
  onFit,
  onIssue,
}: {
  asset: Asset;
  current: number;
  setCurrent: (i: number) => void;
  issues: Issue[];
  onFit: (slideId: string, overflow: boolean) => void;
  onIssue: (i: Issue) => void;
}) {
  const format = getFormat(asset.formatId);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const slide = asset.content.slides[current];
  const total = asset.content.slides.length;
  const width = Math.max(200, Math.min(size.w - 48, ((size.h - 24) * format.width) / format.height));
  const mine = issues.filter((i) => i.slide === current);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-stone/60">
      <div ref={box} className="relative flex min-h-0 flex-1 items-center justify-center p-6">
        {slide && (
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
            onFit={(r) => onFit(slide.id, r.overflow)}
            className="shadow-[0_18px_50px_-24px_rgba(48,43,39,.45)]"
          />
        )}
      </div>
      <div className="flex min-h-[64px] items-start justify-between gap-6 border-t border-line bg-paper/70 px-6 py-3">
        <div className="flex items-center gap-2 pt-1">
          {total > 1 && (
            <button className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => setCurrent(current - 1)} aria-label={`Previous ${unitName(format)}`}>
              <Icon name="chevronLeft" size={16} />
            </button>
          )}
          <span className="text-[12.5px] text-ink-soft">
            {total > 1 ? `${unitName(format) === "page" ? "Page" : "Slide"} ${current + 1} of ${total} · ` : ""}
            {slide ? getLayout(slide.layout).name : ""} · {format.shape === "a4" ? (isLandscape(format) ? "A4 landscape" : "A4") : `${format.width} × ${format.height}`}
          </span>
          {total > 1 && (
            <button className="btn btn-ghost btn-sm" disabled={current === total - 1} onClick={() => setCurrent(current + 1)} aria-label={`Next ${unitName(format)}`}>
              <Icon name="chevronRight" size={16} />
            </button>
          )}
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

"use client";

import type { Asset } from "@/lib/db/schema";
import { getFormat } from "@/lib/brand/formats";
import { SlideView } from "@/components/slides/SlideView";

export function RenderSlides({ asset, slide }: { asset: Asset; slide: number | null }) {
  const format = getFormat(asset.formatId);
  const slides = asset.content.slides;
  const indexes = slide === null ? slides.map((_, i) => i) : [Math.min(Math.max(0, slide), slides.length - 1)];
  return (
    <>
      <style>{`
        @page { size: ${format.width}px ${format.height}px; margin: 0; }
        html, body { margin: 0; padding: 0; background: transparent; }
        .render-page { width: ${format.width}px; height: ${format.height}px; overflow: hidden; break-after: page; }
        .render-page:last-child { break-after: auto; }
      `}</style>
      {indexes.map((i) => (
        <div className="render-page" key={slides[i].id}>
          <SlideView
            format={format}
            slide={slides[i]}
            index={i}
            total={slides.length}
            universeId={asset.universe}
            options={asset.content.options}
            mediaUrl={(id) => `/api/media/${id}/file`}
          />
        </div>
      ))}
    </>
  );
}

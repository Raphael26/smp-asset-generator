"use client";

import type { Asset } from "@/lib/db/schema";
import { getFormat } from "@/lib/brand/formats";
import { ScaledSlide, previewUrl } from "@/components/slides/ScaledSlide";

/** First slide of an asset, fitted inside a box. */
export function AssetThumb({ asset, boxWidth, boxHeight, slide = 0 }: { asset: Asset; boxWidth: number; boxHeight: number; slide?: number }) {
  const format = getFormat(asset.formatId);
  const s = asset.content.slides[slide];
  const width = Math.min(boxWidth, (boxHeight * format.width) / format.height);
  return (
    <div className="flex items-center justify-center bg-stone" style={{ width: boxWidth, height: boxHeight }}>
      {s ? (
        <ScaledSlide
          width={width}
          format={format}
          slide={s}
          index={slide}
          total={asset.content.slides.length}
          universeId={asset.universe}
          options={asset.content.options}
          mediaUrl={previewUrl(400)}
          title={asset.title}
          className="shadow-[0_6px_18px_-10px_rgba(48,43,39,.35)]"
        />
      ) : (
        <span className="eyebrow">Empty</span>
      )}
    </div>
  );
}

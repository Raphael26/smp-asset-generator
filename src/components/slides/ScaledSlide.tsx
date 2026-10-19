"use client";

import { SlideView, type SlideViewProps } from "./SlideView";

/** A slide drawn at its real size and scaled down to `width` pixels on screen. Previews draw links as plain text:
 *  the thumbnail or the stage already sits inside a link or a button. */
export function ScaledSlide({ width, className = "", ...props }: SlideViewProps & { width: number; className?: string }) {
  const scale = width / props.format.width;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height: props.format.height * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: props.format.width, height: props.format.height }}>
        <SlideView {...props} links={false} />
      </div>
    </div>
  );
}

export const previewUrl = (width: number) => (id: string) => `/api/media/${id}/file?w=${width}`;

"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AssetOptions, Slide } from "@/lib/content";
import type { Format } from "@/lib/brand/formats";
import { FULL_PHOTO_DEFAULT_RATIO, fullPhotoZone, getLayout } from "@/lib/brand/layouts";
import { universe as getUniverse } from "@/lib/brand/tokens";
import { frenchTypo, parseRich } from "@/lib/brand/typography";
import { useFit } from "./useFit";
import { Rich, VisioIcon } from "./parts";
import { DocPage } from "./DocPage";

export type SlideViewProps = {
  format: Format;
  slide: Slide;
  index: number;
  total: number;
  universeId: string | null;
  options: AssetOptions;
  /** URL of a media item (the render page asks for the full file, the editor for a preview size). */
  mediaUrl: (mediaId: string) => string;
  /** Show the field hints in faded type where a field is empty (editor only). */
  placeholders?: boolean;
  onFit?: (result: { fit: number; overflow: boolean }) => void;
  /** The asset's title, in the running footer of document pages. */
  title?: string;
  /** Free slides: a block being typed in the editor, left blank so the text box shows in its place. */
  hiddenBlock?: string | null;
  /** Real links in document pages (the PDF export). Off in previews, which sit inside a link or a button. */
  links?: boolean;
};

export function SlideView(props: SlideViewProps) {
  // A4 documents have their own page templates; presentations draw the same pages twice as large, in 16:9.
  if (props.format.shape === "a4" || props.format.shape === "slide") return <DocPage {...props} />;
  return <SocialSlide {...props} />;
}

function SocialSlide({ format, slide, index, total, universeId, options, mediaUrl, placeholders = false, onFit }: SlideViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const def = getLayout(slide.layout);
  const uni = getUniverse(universeId);

  // Field value, or its placeholder in the editor; `ph` tells the caller it is a placeholder.
  const field = (key: string): { value: string; ph: boolean } => {
    const value = (slide.fields[key] ?? "").trim();
    if (value) return { value, ph: false };
    const fdef = def.fields.find((f) => f.key === key);
    if (placeholders && fdef && !fdef.optional) return { value: fdef.placeholder, ph: true };
    return { value: "", ph: false };
  };
  const rich = (key: string, className: string, as: "p" | "span" = "p", Wrapper: "div" | "h1" = "div") => {
    const { value, ph } = field(key);
    if (!value) return null;
    return (
      <Wrapper className={`${className}${ph ? " is-ph" : ""}`} data-field={key}>
        <Rich paragraphs={parseRich(value)} as={as} />
      </Wrapper>
    );
  };
  const plain = (key: string, className: string) => {
    const { value, ph } = field(key);
    if (!value) return null;
    return (
      <p className={`${className}${ph ? " is-ph" : ""}`} data-field={key}>
        {frenchTypo(value.replace(/\*/g, ""))}
      </p>
    );
  };

  // « Full photo + text »: the layout follows the photo's proportions, measured once it has loaded (the image may
  // be complete before React attaches onLoad, so the mount checks it too). A photo that fails to load gets the
  // default proportions rather than holding the slide.
  const fullPhoto = slide.layout === "photo-full";
  const mediaId = slide.image?.mediaId ?? null;
  const imgRef = useRef<HTMLImageElement>(null);
  const [measured, setMeasured] = useState<{ id: string; ratio: number } | null>(null);
  const measure = useCallback(() => {
    const el = imgRef.current;
    if (!el?.complete || !el.dataset.media) return;
    setMeasured({ id: el.dataset.media, ratio: el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : FULL_PHOTO_DEFAULT_RATIO });
  }, []);
  useEffect(measure, [measure, mediaId]);
  const ratio = fullPhoto && mediaId && measured?.id === mediaId ? measured.ratio : null;
  const zone = fullPhoto ? fullPhotoZone(format, ratio ?? FULL_PHOTO_DEFAULT_RATIO) : null;

  // Shrink the type until the body fits, once the fonts are ready. Runs on every change.
  useFit(ref, bodyRef, JSON.stringify([slide, format.id, options, placeholders, universeId, ratio]), onFit, undefined, fullPhoto && Boolean(mediaId) && ratio === null);

  const isLast = index === total - 1;
  const swipe = format.multi && options.swipeHint && !isLast && total > 1;
  const page = format.multi && options.pageNumbers && total > 1 ? `${index + 1} / ${total}` : null;

  const logo =
    options.logo === "none" ? null : options.logo === "monogram" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="smp-logo is-mono" src="/brand/monogram.svg" alt="Spanish Mum in Paris" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="smp-logo" src="/brand/logo.svg" alt="Spanish Mum in Paris" />
    );

  const eyebrow = field("eyebrow");
  const top = (
    <div className="smp-top">
      {eyebrow.value ? (
        <span className={`smp-eyebrow${eyebrow.ph ? " is-ph" : ""}`} data-field="eyebrow">
          {frenchTypo(eyebrow.value)}
        </span>
      ) : (
        <span />
      )}
      {logo}
    </div>
  );

  // Footer: the source of a figure (or the page number) on the left, « Glissez → » on the right.
  const source = field("source");
  const sourceText = slide.layout === "figure" && source.value ? frenchTypo(`Source : ${source.value.replace(/^source\s*:\s*/i, "")}`) : null;
  const bottom = (
    <div className="smp-bottom">
      {sourceText ? (
        <span className={source.ph ? "is-ph" : ""} data-field="source">
          {sourceText}
        </span>
      ) : (
        page && <span>{page}</span>
      )}
      {swipe ? (
        <span className="smp-swipe">
          Glissez <span aria-hidden>→</span>
        </span>
      ) : (
        sourceText && page && <span className="smp-swipe">{page}</span>
      )}
    </div>
  );

  const image = slide.image;
  const photo = zone ? (
    // The whole photo, never cropped: its box is sized from its proportions, the ground shows around it when it is
    // taller than its zone.
    <div className={`smp-photo is-full${zone.inset ? " is-inset" : ""}`} style={{ width: zone.zoneW, height: zone.zoneH }}>
      <div className="smp-photo-box" style={{ left: zone.x, top: zone.y, width: zone.photoW, height: zone.photoH }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={imgRef} data-media={image.mediaId} src={mediaUrl(image.mediaId)} alt="" onLoad={measure} onError={measure} />
        ) : slide.photoJob && placeholders ? (
          <div className="smp-photo-empty anim-pulse">Generating the photo…</div>
        ) : (
          <div className="smp-photo-empty">{placeholders ? "Choose a photo" : ""}</div>
        )}
      </div>
    </div>
  ) : (
    <div className="smp-photo">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(image.mediaId)}
          alt=""
          style={{
            objectPosition: `${image.focusX}% ${image.focusY}%`,
            transform: image.zoom > 1 ? `scale(${image.zoom})` : undefined,
            transformOrigin: `${image.focusX}% ${image.focusY}%`,
          }}
        />
      ) : slide.photoJob && placeholders ? (
        <div className="smp-photo-empty anim-pulse">Generating the photo…</div>
      ) : (
        <div className="smp-photo-empty">{placeholders ? "Choose a photo" : ""}</div>
      )}
    </div>
  );

  let body: ReactNode;
  switch (slide.layout) {
    case "cover":
      body = (
        <>
          {index === 0 && options.universeTag && uni && (
            <span className="smp-tag" style={{ background: uni.tint, color: uni.tintInk }}>
              {uni.number} — {uni.short}
            </span>
          )}
          {rich("title", "smp-title", "span", "h1")}
          {rich("subtitle", "smp-lead")}
        </>
      );
      break;
    case "figure":
      body = (
        <>
          {rich("title", "smp-title", "span", "h1")}
          <div className="smp-stat">
            {plain("value", "smp-value")}
            {rich("text", "smp-stat-text")}
            {plain("contrast", "smp-contrast")}
          </div>
        </>
      );
      break;
    case "text":
      body = (
        <>
          {plain("number", "smp-number")}
          {rich("title", "smp-title", "span", "h1")}
          {rich("body", "smp-body-text")}
        </>
      );
      break;
    case "list": {
      const items = field("items");
      body = (
        <>
          {rich("title", "smp-title", "span", "h1")}
          {items.value && (
            <ul className={`smp-items${items.ph ? " is-ph" : ""}`} data-field="items">
              {items.value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((item, i) => (
                  <li key={i}>
                    <span>
                      <Rich paragraphs={parseRich(item)} as="span" />
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </>
      );
      break;
    }
    case "quote": {
      const q = field("quote");
      const author = field("author");
      const role = field("role");
      body = (
        <>
          {q.value && (
            <div className={`smp-quote${q.ph ? " is-ph" : ""}`} data-field="quote">
              <Rich paragraphs={parseRich(`«${q.value.replace(/^[«"\s]+|[»"\s]+$/g, "")}»`)} />
            </div>
          )}
          {author.value && (
            <p className={`smp-signature${author.ph ? " is-ph" : ""}`} data-field="author">
              {frenchTypo(author.value)}
            </p>
          )}
          {role.value && (
            <p className="smp-role" data-field="role">
              {frenchTypo(role.value)}
            </p>
          )}
        </>
      );
      break;
    }
    case "photo":
    case "photo-full":
      body = (
        <>
          {rich("title", "smp-title", "span", "h1")}
          {rich("text", "smp-body-text")}
        </>
      );
      break;
    case "cta": {
      const button = field("button");
      const url = field("url");
      body = (
        <>
          {eyebrow.value && (
            <span className={`smp-eyebrow${eyebrow.ph ? " is-ph" : ""}`} data-field="eyebrow">
              {frenchTypo(eyebrow.value)}
            </span>
          )}
          {rich("title", "smp-title", "span", "h1")}
          {rich("text", "smp-lead")}
          {button.value && (
            <span className={`smp-button${button.ph ? " is-ph" : ""}`} data-field="button">
              {/r[ée]server un appel/i.test(button.value) ? <VisioIcon /> : null}
              {frenchTypo(button.value)}
              {/r[ée]server un appel/i.test(button.value) ? null : <span aria-hidden>→</span>}
            </span>
          )}
          {url.value && (
            <p className="smp-url" data-field="url">
              {url.value}
            </p>
          )}
        </>
      );
      break;
    }
  }

  const ctaTop = <div className="smp-top">{logo}</div>;
  const ctaBottom = (
    <div className="smp-bottom">
      <span className="smp-tagline">Creating a home you love.</span>
    </div>
  );

  return (
    <div
      ref={ref}
      className={`smp-slide smp-layout-${slide.layout}${slide.layout === "figure" && !field("title").value ? " no-title" : ""}`}
      data-shape={format.shape}
      data-ground={slide.ground}
      style={{ width: format.width, height: format.height }}
    >
      {(slide.layout === "photo" || slide.layout === "photo-full") && photo}
      <div className="smp-inner">
        {slide.layout === "cta" ? ctaTop : top}
        <div className="smp-body" ref={bodyRef}>
          {body}
        </div>
        {slide.layout === "cta" ? ctaBottom : bottom}
      </div>
    </div>
  );
}

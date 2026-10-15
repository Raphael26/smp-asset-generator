"use client";

import { Fragment, useRef, type ReactNode } from "react";
import type { ImageRef } from "@/lib/content";
import { getLayout, MAX_GALLERY } from "@/lib/brand/layouts";
import { universe as getUniverse } from "@/lib/brand/tokens";
import { frenchTypo, parseBlocks, parseRich, splitLinks, type Line } from "@/lib/brand/typography";
import { Rich, VisioIcon } from "./parts";
import { useFit } from "./useFit";
import type { SlideViewProps } from "./SlideView";

/** Inline pieces with *italic*, **bold** and clickable links (the PDF keeps them). */
function InlineLine({ line }: { line: Line }) {
  return (
    <>
      {line.map((piece, k) => (
        <Fragment key={k}>
          {splitLinks(piece.text).map((part, j) => {
            let node: ReactNode = part.href ? (
              <a href={part.href} className="doc-link">
                {part.text}
              </a>
            ) : (
              part.text
            );
            if (piece.em) node = <em>{node}</em>;
            if (piece.strong) node = <strong>{node}</strong>;
            return <Fragment key={j}>{node}</Fragment>;
          })}
        </Fragment>
      ))}
    </>
  );
}

function RichBlocks({ text, className }: { text: string; className: string }) {
  return (
    <div className={className}>
      {parseBlocks(text).map((b, i) => {
        if (b.type === "h")
          return (
            <h3 key={i} className="doc-h">
              <InlineLine line={b.line} />
            </h3>
          );
        if (b.type === "p")
          return (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <InlineLine line={l} />
                </Fragment>
              ))}
            </p>
          );
        const Tag = b.type;
        return (
          <Tag key={i} className={`doc-${b.type}`}>
            {b.items.map((it, j) => (
              <li key={j}>
                <span>
                  <InlineLine line={it} />
                </span>
              </li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

function Photo({ image, mediaUrl, pending, placeholders, className }: { image: ImageRef | null; mediaUrl: (id: string) => string; pending?: boolean; placeholders: boolean; className: string }) {
  return (
    <div className={`doc-photo ${className}`}>
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
      ) : (
        <span className={`doc-photo-empty${pending && placeholders ? " anim-pulse" : ""}`}>{placeholders ? (pending ? "Generating the photo…" : "Choose a photo") : ""}</span>
      )}
    </div>
  );
}

const linkFor = (line: string) => {
  const t = line.trim();
  if (/^@[\w.]+$/.test(t)) return `https://instagram.com/${t.slice(1)}`;
  return splitLinks(t).find((p) => p.href)?.href ?? null;
};

/** One A4 page of a document: the brand's client-document look (guidelines 08). */
export function DocPage({ format, slide, index, total, universeId, options, mediaUrl, placeholders = false, onFit, title = "" }: SlideViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const def = getLayout(slide.layout);
  const uni = getUniverse(universeId);
  useFit(ref, bodyRef, JSON.stringify([slide, format.id, options, placeholders, universeId, title, index, total]), onFit);

  const field = (key: string): { value: string; ph: boolean } => {
    const value = (slide.fields[key] ?? "").trim();
    if (value) return { value, ph: false };
    const fdef = def.fields.find((f) => f.key === key);
    if (placeholders && fdef && !fdef.optional) return { value: fdef.placeholder, ph: true };
    return { value: "", ph: false };
  };
  const ph = (f: { ph: boolean }) => (f.ph ? " is-ph" : "");
  const rich = (key: string, className: string, Wrapper: "div" | "h1" | "h2" = "div") => {
    const f = field(key);
    if (!f.value) return null;
    return (
      <Wrapper className={`${className}${ph(f)}`}>
        <Rich paragraphs={parseRich(f.value)} as="span" />
      </Wrapper>
    );
  };
  const plain = (key: string, className: string) => {
    const f = field(key);
    return f.value ? <p className={`${className}${ph(f)}`}>{frenchTypo(f.value.replace(/\*/g, ""))}</p> : null;
  };
  const blocks = (key: string, className: string) => {
    const f = field(key);
    return f.value ? <RichBlocks text={f.value} className={`${className}${ph(f)}`} /> : null;
  };
  const lines = (key: string) =>
    field(key)
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const logo = options.logo === "none" ? null : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={options.logo === "monogram" ? "doc-logo is-mono" : "doc-logo"} src={options.logo === "monogram" ? "/brand/monogram.svg" : "/brand/logo.svg"} alt="Spanish Mum in Paris" />
  );
  const eyebrow = field("eyebrow");
  const pageNo = index + 1;
  const header = (
    <div className="doc-head">
      {logo}
      {eyebrow.value && <span className={`doc-eyebrow${ph(eyebrow)}`}>{frenchTypo(eyebrow.value)}</span>}
    </div>
  );
  const footer = (
    <div className="doc-foot">
      <span>
        <b>Spanish Mum in Paris</b>
        {title ? ` · ${frenchTypo(title)}` : ""}
      </span>
      <span>{total > 1 ? `${pageNo} / ${total}` : ""}</span>
    </div>
  );

  let body: ReactNode = null;
  let chrome: "page" | "cover" | "closing" = "page";

  switch (slide.layout) {
    case "doc-cover": {
      chrome = "cover";
      const preparedFor = field("preparedFor");
      const date = field("date");
      body = (
        <>
          {slide.image || slide.photoJob ? (
            <Photo image={slide.image} pending={Boolean(slide.photoJob)} mediaUrl={mediaUrl} placeholders={placeholders} className="doc-cover-photo" />
          ) : null}
          <div className="doc-cover-block" style={uni && !slide.image && !slide.photoJob ? { background: uni.tint } : undefined}>
            {uni && (
              <span className="doc-tag" style={{ background: slide.image || slide.photoJob ? uni.tint : "var(--paper)", color: uni.tintInk }}>
                {uni.number} — {uni.short}
              </span>
            )}
            {eyebrow.value && <p className={`doc-eyebrow${ph(eyebrow)}`}>{frenchTypo(eyebrow.value)}</p>}
            {rich("title", "doc-cover-title", "h1")}
            {rich("subtitle", "doc-lead")}
            {(preparedFor.value || date.value) && (
              <p className="doc-for">
                {preparedFor.value && <span>{frenchTypo(preparedFor.value)}</span>}
                {preparedFor.value && date.value && <span className="doc-dot">·</span>}
                {date.value && <span>{frenchTypo(date.value)}</span>}
              </p>
            )}
          </div>
        </>
      );
      break;
    }
    case "doc-page":
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {blocks("body", "doc-rich")}
        </>
      );
      break;
    case "doc-photo":
      body = (
        <>
          <Photo image={slide.image} pending={Boolean(slide.photoJob)} mediaUrl={mediaUrl} placeholders={placeholders} className="doc-page-photo" />
          {rich("title", "doc-title doc-title-sm", "h2")}
          {blocks("body", "doc-rich")}
        </>
      );
      break;
    case "doc-checklist": {
      const items = field("items");
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {rich("intro", "doc-lead")}
          <ul className={`doc-checks${ph(items)}`}>
            {lines("items").map((it, i) => (
              <li key={i}>
                <span className="doc-box" />
                <span>
                  <Rich paragraphs={parseRich(it)} as="span" />
                </span>
              </li>
            ))}
          </ul>
          {rich("note", "doc-note")}
        </>
      );
      break;
    }
    case "doc-table": {
      const t = field("table");
      const rows = lines("table").map((r) => r.split("|").map((c) => c.trim()));
      const cols = Math.max(1, ...rows.map((r) => r.length));
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {rich("intro", "doc-lead")}
          {rows.length > 0 && (
            <table className={`doc-table${ph(t)}`}>
              <thead>
                <tr>
                  {Array.from({ length: cols }, (_, c) => (
                    <th key={c}>{frenchTypo(rows[0][c] ?? "")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r, i) => (
                  <tr key={i}>
                    {Array.from({ length: cols }, (_, c) => (
                      <td key={c}>
                        <InlineLine line={parseRich(r[c] ?? "")[0]?.[0] ?? []} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rich("note", "doc-note")}
        </>
      );
      break;
    }
    case "doc-figures": {
      const figs = [1, 2, 3]
        .map((n) => ({ value: field(`value${n}`), text: field(`text${n}`), source: field(`source${n}`) }))
        .filter((f) => f.value.value);
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {rich("intro", "doc-lead")}
          <div className="doc-figures" data-count={figs.length}>
            {figs.map((f, i) => (
              <div key={i} className="doc-figure">
                <p className={`doc-value${ph(f.value)}`}>{frenchTypo(f.value.value)}</p>
                {f.text.value && (
                  <div className={`doc-figure-text${ph(f.text)}`}>
                    <Rich paragraphs={parseRich(f.text.value)} as="span" />
                  </div>
                )}
                {f.source.value && <p className={`doc-source${ph(f.source)}`}>{frenchTypo(f.source.value.replace(/^source\s*:\s*/i, ""))}</p>}
              </div>
            ))}
          </div>
        </>
      );
      break;
    }
    case "doc-offer": {
      const button = field("button");
      const included = lines("included");
      body = (
        <>
          {rich("title", "doc-offer-name", "h2")}
          {plain("price", "doc-price")}
          {rich("description", "doc-lead")}
          {included.length > 0 && (
            <div className="doc-included">
              <p className="doc-eyebrow">Ce qui est inclus</p>
              <ul>
                {included.map((it, i) => (
                  <li key={i}>
                    <span>
                      <Rich paragraphs={parseRich(it)} as="span" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {button.value && (
            <a className={`doc-button${ph(button)}`} href="https://calendly.com/spanishmuminparis">
              {/r[ée]server un appel/i.test(button.value) && <VisioIcon />}
              {frenchTypo(button.value)}
            </a>
          )}
          {plain("note", "doc-small")}
        </>
      );
      break;
    }
    case "doc-moodboard": {
      const gallery = (slide.gallery ?? []).slice(0, MAX_GALLERY);
      const shown = gallery.length ? gallery : placeholders ? [{ image: null }, { image: null }, { image: null }, { image: null }] : [];
      const palette = (field("palette").value.match(/#[0-9a-f]{3,8}\b/gi) ?? []).slice(0, 8);
      const materials = lines("materials");
      body = (
        <>
          {rich("title", "doc-title doc-title-sm", "h2")}
          {rich("text", "doc-lead")}
          {shown.length > 0 && (
            <div className="doc-gallery" data-count={shown.length}>
              {shown.map((g, i) => (
                <Photo key={i} image={g.image} pending={Boolean("photoJob" in g && g.photoJob)} mediaUrl={mediaUrl} placeholders={placeholders} className="doc-gallery-cell" />
              ))}
            </div>
          )}
          {(palette.length > 0 || materials.length > 0) && (
            <div className="doc-swatches-row">
              {palette.length > 0 && (
                <div>
                  <p className="doc-eyebrow">Palette</p>
                  <div className="doc-swatches">
                    {palette.map((c) => (
                      <span key={c} className="doc-swatch">
                        <span style={{ background: c }} />
                        {c.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {materials.length > 0 && (
                <div>
                  <p className="doc-eyebrow">Matières</p>
                  <p className="doc-materials">{materials.map((m) => frenchTypo(m)).join("  ·  ")}</p>
                </div>
              )}
            </div>
          )}
        </>
      );
      break;
    }
    case "doc-closing": {
      chrome = "closing";
      const signature = field("signature");
      body = (
        <>
          {eyebrow.value && <p className={`doc-eyebrow${ph(eyebrow)}`}>{frenchTypo(eyebrow.value)}</p>}
          {rich("title", "doc-closing-title", "h2")}
          {rich("text", "doc-lead")}
          <ul className="doc-contacts">
            {lines("contacts").map((c, i) => {
              const href = linkFor(c);
              return <li key={i}>{href ? <a href={href}>{c}</a> : frenchTypo(c)}</li>;
            })}
          </ul>
          {signature.value && <p className={`doc-signature${ph(signature)}`}>{frenchTypo(signature.value)}</p>}
          <p className="doc-tagline">Creating a home you love.</p>
        </>
      );
      break;
    }
    case "quote": {
      const author = field("author");
      const role = field("role");
      const q = field("quote");
      body = (
        <div className="doc-quote-wrap">
          {q.value && (
            <div className={`doc-quote${ph(q)}`}>
              <Rich paragraphs={parseRich(`«${q.value.replace(/^[«"\s]+|[»"\s]+$/g, "")}»`)} />
            </div>
          )}
          {author.value && <p className={`doc-signature${ph(author)}`}>{frenchTypo(author.value)}</p>}
          {role.value && <p className="doc-eyebrow">{frenchTypo(role.value)}</p>}
        </div>
      );
      break;
    }
    default:
      // A social template that ended up in a document: show its main text rather than nothing.
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {blocks(def.fields.find((f) => f.kind === "text")?.key ?? "body", "doc-rich")}
        </>
      );
  }

  return (
    <div
      ref={ref}
      className={`smp-slide smp-doc doc-${chrome} smp-layout-${slide.layout}`}
      data-shape="a4"
      data-ground={slide.ground}
      style={{ width: format.width, height: format.height }}
    >
      <div className="smp-inner">
        {chrome === "cover" ? (
          <div className="doc-head">
            {logo}
            {field("date").value ? null : <span className="doc-eyebrow">spanishmuminparis.com</span>}
          </div>
        ) : chrome === "closing" ? (
          <div className="doc-head doc-head-center">{logo}</div>
        ) : (
          header
        )}
        <div className="smp-body" ref={bodyRef}>
          {body}
        </div>
        {chrome === "page" ? footer : chrome === "cover" ? <div className="doc-foot doc-foot-cover"><span>spanishmuminparis.com · @spanishmuminparis</span><span /></div> : null}
      </div>
    </div>
  );
}

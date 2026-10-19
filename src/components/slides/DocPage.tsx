"use client";

import { createContext, Fragment, useContext, useRef, type CSSProperties, type ReactNode } from "react";
import type { Block, BlockStyle, BoxFill, ImageRef, SlideChrome } from "@/lib/content";
import { isLandscape } from "@/lib/brand/formats";
import { getLayout, MAX_GALLERY } from "@/lib/brand/layouts";
import { fillHex, textSize } from "@/lib/brand/blocks";
import { universe as getUniverse } from "@/lib/brand/tokens";
import { frenchTypo, parseBlocks, parseRich, plainText, splitLinks, type Line } from "@/lib/brand/typography";
import { Rich, VisioIcon } from "./parts";
import { useFit } from "./useFit";
import type { SlideViewProps } from "./SlideView";

/** Whether links are real anchors (the PDF export) or plain spans (previews, which sit inside a link or a button). */
const LinksContext = createContext(true);

function MaybeLink({ href, className, attrs, children }: { href: string; className?: string; attrs?: Record<string, string>; children: ReactNode }) {
  const links = useContext(LinksContext);
  return links ? (
    <a href={href} className={className} {...attrs}>
      {children}
    </a>
  ) : (
    <span className={className} {...attrs}>
      {children}
    </span>
  );
}

/** Inline pieces with *italic*, **bold** and clickable links (the PDF keeps them). */
function InlineLine({ line }: { line: Line }) {
  return (
    <>
      {line.map((piece, k) => (
        <Fragment key={k}>
          {splitLinks(piece.text).map((part, j) => {
            let node: ReactNode = part.href ? (
              <MaybeLink href={part.href} className="doc-link">
                {part.text}
              </MaybeLink>
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

function RichBlocks({ text, className, attrs }: { text: string; className: string; attrs?: Record<string, string> }) {
  return (
    <div className={className} {...attrs}>
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

/** A photo frame. `freeIndex` marks it for « unlock » (-1: the slide's photo, else a moodboard cell). */
function Photo({
  image,
  mediaUrl,
  pending,
  placeholders,
  className,
  freeIndex,
}: {
  image: ImageRef | null;
  mediaUrl: (id: string) => string;
  pending?: boolean;
  placeholders: boolean;
  className: string;
  freeIndex?: number;
}) {
  return (
    <div className={`doc-photo ${className}`} {...(freeIndex !== undefined ? { "data-free": "image", "data-free-index": String(freeIndex) } : {})}>
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

/** A table with hairlines: one row per line, cells separated by « | », the first row as header. */
function Table({ rows: text, className = "", annotate, field }: { rows: string; className?: string; annotate?: string; field?: string }) {
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((r) => r.split("|").map((c) => c.trim()));
  if (!rows.length) return null;
  const cols = Math.max(1, ...rows.map((r) => r.length));
  return (
    <table className={`doc-table${className}`} data-field={field} {...(annotate !== undefined ? { "data-free": "table", "data-free-text": annotate } : {})}>
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
  );
}

const linkFor = (line: string) => {
  const t = line.trim();
  if (/^@[\w.]+$/.test(t)) return `https://instagram.com/${t.slice(1)}`;
  return splitLinks(t).find((p) => p.href)?.href ?? null;
};

// ——— « Unlock »: the text styles of the templates, so a page can be turned into free blocks ———
// Each rendered text carries its block style and raw text; the editor measures it and makes a block.
// Each one also carries its field name (data-field), so the editor can open a text box over it.

const FREE_STYLE: [RegExp, BlockStyle, number][] = [
  [/\bdoc-cover-title\b/, "cover-title", 100],
  [/\bdeck-section-title\b/, "cover-title", 100],
  [/\bdoc-offer-name\b/, "cover-title", 96],
  [/\bdoc-closing-title\b/, "cover-title", 92],
  [/\bdoc-title-sm\b/, "title", 74],
  [/\bdoc-title\b/, "title", 100],
  [/\bdoc-lead\b/, "lead", 100],
  [/\bdoc-rich\b/, "body", 100],
  [/\bdoc-note\b/, "body", 92],
  [/\bdoc-eyebrow\b/, "eyebrow", 100],
  [/\bdoc-small\b/, "small", 100],
  [/\bdoc-value\b/, "figure", 100],
  [/\bdeck-number\b/, "figure", 123],
  [/\bdoc-price\b/, "price", 100],
  [/\bdoc-signature\b/, "signature", 100],
  [/\bdoc-tagline\b/, "tagline", 100],
  [/\bdoc-for\b/, "tagline", 120],
  [/\bdoc-button\b/, "button", 100],
  [/\bdoc-figure-text\b/, "body", 86],
  [/\bdoc-source\b/, "eyebrow", 85],
  [/\bdoc-materials\b/, "body", 86],
];

function freeAttrs(className: string, text: string, style?: BlockStyle, size = 100): Record<string, string> {
  const m = style ? null : FREE_STYLE.find(([re]) => re.test(className));
  const s = style ?? m?.[1];
  if (!s) return {};
  return { "data-free": "text", "data-free-style": s, "data-free-size": String(style ? size : m![2]), "data-free-text": text };
}

const UNIVERSE_FILL: Record<string, BoxFill> = { decoration: "sable", organisation: "sauge", entreprises: "blush" };

// ——— Free slides: blocks placed by hand, in the 960 × 540 design space of the inner frame ———

function FreeBlock({ block: b, mediaUrl, placeholders, hidden }: { block: Block; mediaUrl: (id: string) => string; placeholders: boolean; hidden: boolean }) {
  const base: CSSProperties = { left: b.x, top: b.y, width: b.w, height: b.h, visibility: hidden ? "hidden" : undefined };
  switch (b.type) {
    case "text": {
      const empty = !b.text.trim();
      return (
        <div
          className={`free-block free-text${empty ? " is-ph" : ""}`}
          data-block={b.id}
          data-style={b.style}
          data-align={b.align}
          data-valign={b.valign}
          data-columns={b.columns === 2 ? "2" : undefined}
          style={{ ...base, fontSize: textSize(b) }}
        >
          {empty ? (
            placeholders ? <span>Double-click to type</span> : null
          ) : b.style === "button" ? (
            <span className="doc-button">
              {/r[ée]server un appel/i.test(b.text) && <VisioIcon />}
              {frenchTypo(plainText(b.text))}
            </span>
          ) : (
            <RichBlocks text={b.text} className="doc-rich" />
          )}
        </div>
      );
    }
    case "image":
      return (
        <div className="free-block" data-block={b.id} style={base}>
          <Photo image={b.image} mediaUrl={mediaUrl} placeholders={placeholders} className="free-image" />
        </div>
      );
    case "box":
      return <div className="free-block free-box" data-block={b.id} data-accent={b.accent ? "true" : undefined} style={{ ...base, background: fillHex(b.fill) }} />;
    case "line": {
      const vertical = b.h > b.w;
      const t = b.strong ? 2 : 1;
      return <div className="free-block free-line" data-block={b.id} data-strong={b.strong ? "true" : undefined} style={{ ...base, width: vertical ? t : b.w, height: vertical ? b.h : t }} />;
    }
    case "table":
      return (
        <div className="free-block free-table" data-block={b.id} style={base}>
          <Table rows={b.rows} />
        </div>
      );
  }
}

/** One A4 page of a document: the brand's client-document look (guidelines 08). In landscape, photos,
 *  galleries and the offer's list sit beside the text instead of above or below it. A presentation slide is
 *  the same landscape page drawn twice as large (docs.css zooms the inner frame), plus the deck templates;
 *  a free slide draws Rebeca's blocks over an empty page. */
export function DocPage({ format, slide, index, total, universeId, options, mediaUrl, placeholders = false, onFit, title = "", hiddenBlock = null, links = true }: SlideViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const def = getLayout(slide.layout);
  const uni = getUniverse(universeId);
  const landscape = isLandscape(format);
  useFit(ref, bodyRef, JSON.stringify([slide, format.id, options, placeholders, universeId, title, index, total]), onFit, (el) => {
    // Free slides: a text block fuller than its box counts as overflow (and is marked for the editor).
    let any = false;
    for (const t of el.querySelectorAll<HTMLElement>(".free-text")) {
      const over = t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1;
      t.dataset.overflow = String(over);
      any ||= over;
    }
    return any;
  });

  const field = (key: string): { value: string; ph: boolean } => {
    const value = (slide.fields[key] ?? "").trim();
    if (value) return { value, ph: false };
    const fdef = def.fields.find((f) => f.key === key);
    if (placeholders && fdef && !fdef.optional) return { value: fdef.placeholder, ph: true };
    return { value: "", ph: false };
  };
  const ph = (f: { ph: boolean }) => (f.ph ? " is-ph" : "");
  const raw = (f: { value: string; ph: boolean }) => (f.ph ? "" : f.value);
  const rich = (key: string, className: string, Wrapper: "div" | "h1" | "h2" = "div") => {
    const f = field(key);
    if (!f.value) return null;
    return (
      <Wrapper className={`${className}${ph(f)}`} data-field={key} {...freeAttrs(className, raw(f))}>
        <Rich paragraphs={parseRich(f.value)} as="span" />
      </Wrapper>
    );
  };
  const plain = (key: string, className: string) => {
    const f = field(key);
    return f.value ? (
      <p className={`${className}${ph(f)}`} data-field={key} {...freeAttrs(className, raw(f).replace(/\*/g, ""))}>
        {frenchTypo(f.value.replace(/\*/g, ""))}
      </p>
    ) : null;
  };
  const blocks = (key: string, className: string) => {
    const f = field(key);
    return f.value ? <RichBlocks text={f.value} className={`${className}${ph(f)}`} attrs={{ ...freeAttrs(className, raw(f)), "data-field": key }} /> : null;
  };
  const lines = (key: string) =>
    field(key)
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  const bullets = (key: string, prefix: (i: number) => string = () => "- ") => (field(key).ph ? "" : lines(key).map((l, i) => prefix(i) + l).join("\n"));

  const logo = options.logo === "none" ? null : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={options.logo === "monogram" ? "doc-logo is-mono" : "doc-logo"} src={options.logo === "monogram" ? "/brand/monogram.svg" : "/brand/logo.svg"} alt="Spanish Mum in Paris" />
  );
  const eyebrow = field("eyebrow");
  const pageNo = index + 1;
  const header = (
    <div className="doc-head">
      {logo}
      {eyebrow.value && (
        <span className={`doc-eyebrow${ph(eyebrow)}`} data-field="eyebrow">
          {frenchTypo(eyebrow.value)}
        </span>
      )}
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
  let chrome: SlideChrome = "page";

  switch (slide.layout) {
    case "doc-cover": {
      chrome = "cover";
      const preparedFor = field("preparedFor");
      const date = field("date");
      const photo =
        slide.image || slide.photoJob ? (
          <Photo image={slide.image} pending={Boolean(slide.photoJob)} mediaUrl={mediaUrl} placeholders={placeholders} className="doc-cover-photo" freeIndex={-1} />
        ) : null;
      const tinted = Boolean(uni && !photo);
      const block = (
        <div className="doc-cover-block" style={tinted && uni ? { background: uni.tint } : undefined} {...(tinted && uni ? { "data-free": "box", "data-free-fill": UNIVERSE_FILL[uni.id] } : {})}>
          {uni && (
            <span className="doc-tag" style={{ background: photo ? uni.tint : "var(--paper)", color: uni.tintInk }}>
              {uni.number} — {uni.short}
            </span>
          )}
          {eyebrow.value && (
            <p className={`doc-eyebrow${ph(eyebrow)}`} data-field="eyebrow" {...freeAttrs("doc-eyebrow", raw(eyebrow))}>
              {frenchTypo(eyebrow.value)}
            </p>
          )}
          {rich("title", "doc-cover-title", "h1")}
          {rich("subtitle", "doc-lead")}
          {(preparedFor.value || date.value) && (
            <p className="doc-for" data-field="preparedFor" {...freeAttrs("doc-for", [raw(preparedFor), raw(date)].filter(Boolean).join(" · "))}>
              {preparedFor.value && <span>{frenchTypo(preparedFor.value)}</span>}
              {preparedFor.value && date.value && <span className="doc-dot">·</span>}
              {date.value && <span>{frenchTypo(date.value)}</span>}
            </p>
          )}
        </div>
      );
      body =
        landscape && photo ? (
          <div className="doc-split doc-split-cover">
            {block}
            {photo}
          </div>
        ) : (
          <>
            {photo}
            {block}
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
    case "doc-photo": {
      const photo = <Photo image={slide.image} pending={Boolean(slide.photoJob)} mediaUrl={mediaUrl} placeholders={placeholders} className="doc-page-photo" freeIndex={-1} />;
      const text = (
        <>
          {rich("title", "doc-title doc-title-sm", "h2")}
          {blocks("body", "doc-rich")}
        </>
      );
      body = landscape ? (
        <div className="doc-split">
          {photo}
          <div className="doc-split-text doc-split-center">{text}</div>
        </div>
      ) : (
        <>
          {photo}
          {text}
        </>
      );
      break;
    }
    case "doc-checklist": {
      const items = field("items");
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {rich("intro", "doc-lead")}
          <ul className={`doc-checks${ph(items)}`} data-field="items" {...freeAttrs("", bullets("items"), "body")}>
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
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {rich("intro", "doc-lead")}
          <Table rows={t.value} className={ph(t)} annotate={raw(t)} field="table" />
          {rich("note", "doc-note")}
        </>
      );
      break;
    }
    case "doc-figures": {
      const figs = [1, 2, 3]
        .map((n) => ({ n, value: field(`value${n}`), text: field(`text${n}`), source: field(`source${n}`) }))
        .filter((f) => f.value.value);
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {rich("intro", "doc-lead")}
          <div className="doc-figures" data-count={figs.length}>
            {figs.map((f, i) => (
              <div key={i} className="doc-figure" data-free="box" data-free-fill={slide.ground === "paper" ? "cream" : "paper"} data-free-accent="true">
                <p className={`doc-value${ph(f.value)}`} data-field={`value${f.n}`} {...freeAttrs("doc-value", raw(f.value))}>
                  {frenchTypo(f.value.value)}
                </p>
                {f.text.value && (
                  <div className={`doc-figure-text${ph(f.text)}`} data-field={`text${f.n}`} {...freeAttrs("doc-figure-text", raw(f.text))}>
                    <Rich paragraphs={parseRich(f.text.value)} as="span" />
                  </div>
                )}
                {f.source.value && (
                  <p className={`doc-source${ph(f.source)}`} data-field={`source${f.n}`} {...freeAttrs("doc-source", raw(f.source).replace(/^source\s*:\s*/i, ""))}>
                    {frenchTypo(f.source.value.replace(/^source\s*:\s*/i, ""))}
                  </p>
                )}
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
      const head = (
        <>
          {rich("title", "doc-offer-name", "h2")}
          {plain("price", "doc-price")}
          {rich("description", "doc-lead")}
        </>
      );
      const list = included.length > 0 && (
        <div className="doc-included" data-free="box" data-free-fill={slide.ground === "stone" ? "paper" : "stone"}>
          <p className="doc-eyebrow" {...freeAttrs("doc-eyebrow", "Ce qui est inclus")}>
            Ce qui est inclus
          </p>
          <ul data-field="included" {...freeAttrs("", bullets("included"), "body")}>
            {included.map((it, i) => (
              <li key={i}>
                <span>
                  <Rich paragraphs={parseRich(it)} as="span" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
      const foot = (
        <>
          {button.value && (
            <MaybeLink className={`doc-button${ph(button)}`} href="https://calendly.com/spanishmuminparis" attrs={{ ...freeAttrs("doc-button", raw(button)), "data-field": "button" }}>
              {/r[ée]server un appel/i.test(button.value) && <VisioIcon />}
              {frenchTypo(button.value)}
            </MaybeLink>
          )}
          {plain("note", "doc-small")}
        </>
      );
      body =
        landscape && list ? (
          <div className="doc-split">
            <div className="doc-split-text">
              {head}
              {foot}
            </div>
            {list}
          </div>
        ) : (
          <>
            {head}
            {list}
            {foot}
          </>
        );
      break;
    }
    case "doc-moodboard": {
      const gallery = (slide.gallery ?? []).slice(0, MAX_GALLERY);
      const shown = gallery.length ? gallery : placeholders ? [{ image: null }, { image: null }, { image: null }, { image: null }] : [];
      const palette = (field("palette").value.match(/#[0-9a-f]{3,8}\b/gi) ?? []).slice(0, 8);
      const materials = lines("materials");
      const intro = (
        <>
          {rich("title", "doc-title doc-title-sm", "h2")}
          {rich("text", "doc-lead")}
        </>
      );
      const grid = shown.length > 0 && (
        <div className="doc-gallery" data-count={shown.length}>
          {shown.map((g, i) => (
            <Photo key={i} image={g.image} pending={Boolean("photoJob" in g && g.photoJob)} mediaUrl={mediaUrl} placeholders={placeholders} className="doc-gallery-cell" freeIndex={i} />
          ))}
        </div>
      );
      const swatches = (palette.length > 0 || materials.length > 0) && (
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
              <p className="doc-eyebrow" {...freeAttrs("doc-eyebrow", "Matières")}>
                Matières
              </p>
              <p className="doc-materials" data-field="materials" {...freeAttrs("doc-materials", materials.join("  ·  "))}>
                {materials.map((m) => frenchTypo(m)).join("  ·  ")}
              </p>
            </div>
          )}
        </div>
      );
      body =
        landscape && grid ? (
          <div className="doc-split doc-split-moodboard">
            {grid}
            <div className="doc-split-text">
              {intro}
              {swatches}
            </div>
          </div>
        ) : (
          <>
            {intro}
            {grid}
            {swatches}
          </>
        );
      break;
    }
    case "doc-closing": {
      chrome = "closing";
      const signature = field("signature");
      body = (
        <>
          {eyebrow.value && (
            <p className={`doc-eyebrow${ph(eyebrow)}`} data-field="eyebrow" {...freeAttrs("doc-eyebrow", raw(eyebrow))}>
              {frenchTypo(eyebrow.value)}
            </p>
          )}
          {rich("title", "doc-closing-title", "h2")}
          {rich("text", "doc-lead")}
          <ul className="doc-contacts" data-field="contacts" {...freeAttrs("", field("contacts").ph ? "" : lines("contacts").join("\n"), "body")}>
            {lines("contacts").map((c, i) => {
              const href = linkFor(c);
              return <li key={i}>{href ? <MaybeLink href={href}>{c}</MaybeLink> : frenchTypo(c)}</li>;
            })}
          </ul>
          {signature.value && (
            <p className={`doc-signature${ph(signature)}`} data-field="signature" {...freeAttrs("doc-signature", raw(signature))}>
              {frenchTypo(signature.value)}
            </p>
          )}
          <p className="doc-tagline" {...freeAttrs("doc-tagline", "Creating a home you love.")}>
            Creating a home you love.
          </p>
        </>
      );
      break;
    }
    case "deck-section":
      body = (
        <div className="deck-section-wrap">
          {plain("number", "deck-number")}
          {rich("title", "deck-section-title", "h2")}
          {rich("text", "doc-lead")}
        </div>
      );
      break;
    case "deck-agenda": {
      const items = field("items");
      body = (
        <>
          {rich("title", "doc-title", "h2")}
          {rich("intro", "doc-lead")}
          <ol className={`deck-agenda${ph(items)}`} data-field="items" {...freeAttrs("", bullets("items", (i) => `${i + 1}. `), "lead")}>
            {lines("items").map((it, i) => (
              <li key={i}>
                <span className="deck-agenda-n">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <Rich paragraphs={parseRich(it)} as="span" />
                </span>
              </li>
            ))}
          </ol>
        </>
      );
      break;
    }
    case "free":
      chrome = slide.chrome ?? "page";
      break;
    case "quote": {
      const author = field("author");
      const role = field("role");
      const q = field("quote");
      const quoted = `«${q.value.replace(/^[«"\s]+|[»"\s]+$/g, "")}»`;
      body = (
        <div className="doc-quote-wrap">
          {q.value && (
            <div className={`doc-quote${ph(q)}`} data-field="quote" {...freeAttrs("", q.ph ? "" : quoted, "quote")}>
              <Rich paragraphs={parseRich(quoted)} />
            </div>
          )}
          {author.value && (
            <p className={`doc-signature${ph(author)}`} data-field="author" {...freeAttrs("doc-signature", raw(author))}>
              {frenchTypo(author.value)}
            </p>
          )}
          {role.value && (
            <p className="doc-eyebrow" data-field="role" {...freeAttrs("doc-eyebrow", raw(role))}>
              {frenchTypo(role.value)}
            </p>
          )}
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

  const free =
    slide.layout === "free" ? (
      <div className="free-layer">
        {placeholders && !(slide.blocks ?? []).length && <p className="free-empty">An empty slide. Add a text, a photo, a box, a line or a table from the panel on the right.</p>}
        {(slide.blocks ?? []).map((b) => (
          <FreeBlock key={b.id} block={b} mediaUrl={mediaUrl} placeholders={placeholders} hidden={hiddenBlock === b.id} />
        ))}
      </div>
    ) : null;

  return (
    <LinksContext.Provider value={links}>
      <div
        ref={ref}
        className={`smp-slide smp-doc doc-${chrome} smp-layout-${slide.layout}`}
        data-shape={format.shape}
        data-orientation={landscape ? "landscape" : "portrait"}
        data-ground={slide.ground}
        data-editor={placeholders ? "true" : undefined}
        style={{ width: format.width, height: format.height }}
      >
        <div className="smp-inner">
          {chrome === "none" ? null : chrome === "cover" ? (
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
          {chrome === "page" ? (
            footer
          ) : chrome === "cover" ? (
            <div className="doc-foot doc-foot-cover">
              <span>spanishmuminparis.com · @spanishmuminparis</span>
              <span />
            </div>
          ) : null}
          {free}
        </div>
      </div>
    </LinksContext.Provider>
  );
}

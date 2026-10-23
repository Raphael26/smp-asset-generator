// From Rebeca's prompt to a finished visual: Claude chooses the format and the templates, writes
// every text and caption, and writes a photo prompt where a photo helps. The studio then sets the
// text in the brand fonts and Flux generates the photos. Text is never drawn by an image model.
import { z } from "zod";
import type { Asset, CreateOptions, Media } from "@/lib/db/schema";
import { DEFAULT_OPTIONS, type AssetContent, type GalleryItem, type GroundId, type ImageRef, type LayoutId, type Slide } from "@/lib/content";
import { ALL_FORMATS, FORMATS, LANDSCAPE_DOCUMENTS, getFormat, isDeck, isDocument, isLandscape, isSocial, withOrientation, type Format } from "@/lib/brand/formats";
import { LAYOUTS, MAX_GALLERY, equivalentLayout, getLayout, newSlide } from "@/lib/brand/layouts";
import { GROUNDS, UNIVERSES } from "@/lib/brand/tokens";
import { PHOTO_BRIEF } from "@/lib/brand/voice";
import { describeAsset, structured } from "@/lib/ai/claude";

/** Generated photos per request: a few for a social visual, more for a document with a moodboard. */
export const MAX_GENERATED_PHOTOS = 4;
export const MAX_GENERATED_PHOTOS_DOCUMENT = 6;

// ——— The guide: everything Claude needs to know about the studio, built from the code so it never drifts ———

function buildGuide(): string {
  const l: string[] = [];
  l.push("# Making a visual in the studio");
  l.push("Rebeca describes what she wants. You return the finished visual as data: the studio lays out your text in the brand's templates, fonts and colours, and an image model generates the photos you describe. You never draw text into images.");
  l.push("");
  l.push("## Formats");
  const count = (f: Format) =>
    !f.multi ? "a single image (exactly one slide)" : isDocument(f) ? `document of up to ${f.maxSlides} pages` : isDeck(f) ? `deck of up to ${f.maxSlides} slides` : `carousel of up to ${f.maxSlides} slides`;
  for (const f of FORMATS) l.push(`- ${f.id}: ${f.platform} ${f.name.toLowerCase()}, ${f.width}×${f.height}, ${count(f)}. ${f.hint}`);
  l.push(`- ${LANDSCAPE_DOCUMENTS.map((f) => f.id).join(", ")}: the same A4 documents in landscape (${LANDSCAPE_DOCUMENTS[0].width}×${LANDSCAPE_DOCUMENTS[0].height}).`);
  l.push("");
  const photoNote = (t: (typeof LAYOUTS)[number]) =>
    t.image === "required" ? " Has a photo (required)." : t.image === "optional" ? " Can have a photo." : t.image === "gallery" ? ` Has a gallery of up to ${MAX_GALLERY} photos.` : "";
  const forKind = (t: (typeof LAYOUTS)[number]) =>
    t.kind === "both" ? "every format" : t.kind === "document" ? "A4 documents and presentations" : t.kind === "deck" ? "presentations only" : "social formats only";
  l.push("## Templates (each slide or page uses one)");
  for (const t of LAYOUTS) {
    if (t.manual) continue;
    l.push(`### ${t.id} — ${t.name} (${forKind(t)}): ${t.description}${photoNote(t)}`);
    for (const f of t.fields) {
      const limit = f.kind === "list" ? `max ${f.max} items, one per line` : `max ${f.max} characters`;
      const kind =
        f.kind === "title"
          ? "title (*italic* allowed, \\n for a line break)"
          : f.kind === "text"
            ? "paragraph (*italic*, **bold** allowed)"
            : f.kind === "rich"
              ? "rich text (paragraphs, « ## » subheadings, « - » bullets, « 1. » steps, *italic*, **bold**)"
              : f.kind === "table"
                ? "table (one row per line, cells separated by « | », header row first)"
                : f.kind === "list"
                  ? "list"
                  : "single line";
      const lim = f.kind === "table" ? `max ${f.max} rows` : limit;
      l.push(`- ${f.key}: ${f.label}, ${kind}, ${lim}, ${f.optional ? "optional" : "required"}. Example: ${JSON.stringify(f.placeholder)}${f.help ? `. ${f.help}` : ""}`);
    }
  }
  l.push("");
  l.push("## Grounds");
  for (const g of GROUNDS) l.push(`- ${g.id}: ${g.use}.`);
  l.push("");
  l.push("## Universes");
  for (const u of UNIVERSES) l.push(`- ${u.id}: ${u.number} — ${u.short} · ${u.name}`);
  l.push("- none: general content that belongs to no single universe.");
  l.push("");
  l.push("## How to compose");
  l.push("- Carousel: 4 to 8 slides unless she asks otherwise. Slide 1 hooks the reader (a title, or a key figure when she gave a striking sourced figure). One idea per slide. The last slide is the closing template (cta) on the band ground. Alternate cream and paper grounds for rhythm.");
  l.push("- Single post or story: exactly one slide, in the template that carries the message best.");
  l.push("- Social formats use only social templates (and quote); A4 documents use only document pages (doc-…) and quote; presentations use the document pages, the deck-… templates and quote.");
  l.push("- Eyebrows: a short noun phrase, usually the same on every slide of a carousel (for example the theme, or « 01 — Décoration »).");
  l.push("- Titles: one *italic* phrase for the warm or emotional words, ending with a full stop (questions keep their question mark).");
  l.push("- Her own words come first: when she gives wording, keep it verbatim where it fits; only fix typos and fit it to the limits. When she gives a topic, write the copy yourself, in her voice.");
  l.push("- Figures: only the figures she gave, with the source and year she gave. Never invent a number, a study, a source or a testimonial. If she asks for figures without giving them, use other templates and say so in the notes.");
  l.push("- Every required field is filled and every text stays within its limit.");
  l.push("- Caption: the post text published with the visual, plain text without asterisks or emoji. LinkedIn: a hook on the first line, short paragraphs, 600 to 1 200 characters, at most three hashtags at the end. Instagram: 300 to 900 characters, « Lien en bio », up to five hashtags. Facebook: 300 to 800 characters, no hashtags needed.");
  l.push("- Title of the asset: a short working title in French for her library.");
  l.push("- Notes: two to five short notes in English for Rebeca: the choices you made, and anything she should check or provide.");
  l.push("");
  l.push("## A4 documents (exported as PDF)");
  l.push("- Pages, not slides: a text page holds about 1 800 characters; spread longer content over several pages rather than cramming. One subject per page, with a title.");
  l.push("- Guide (doc-guide): a cover (often with a photo), an introduction page, three to six pages of advice (text or photo pages, one idea each), often a checklist, then the closing page. Five to ten pages.");
  l.push("- Client document (doc-client): for one client she names, written to them (« vous »), with « Préparé pour … » on the cover. Moodboard pages (gallery, palette, materials), shopping lists (table: piece | shop | price | link), the Home Routine planning (table of days and moments, or checklists), advice pages, the closing page. Never invent products, shops, prices or links: write « à compléter » in a cell she did not give.");
  l.push("- Offer sheet (doc-offer): one to three pages: an optional cover, one offer page per formula with the exact names and prices, the closing page.");
  l.push("- Corporate proposal (doc-proposal): « Préparé pour » the company on the cover, a context page (what is at stake for them), a key-figures page (only figures she gave, each with its source), the programme of the Home & Life Balance workshop, an offer page (price « Sur devis » unless she gives one), The Home Balance Toolkit if relevant, the closing page.");
  l.push("- Tables: three to five columns, at most fifteen rows. Checklists: short items to tick.");
  l.push("- Orientation: portrait unless she asks for landscape (« paysage », « horizontal », « à l’italienne »); then use the « -landscape » id of the same document. Landscape pages use the same templates and hold about as much text: the photo, the moodboard gallery or the offer's list sits beside the text, text pages and checklists run in two columns. A landscape table holds about ten rows: split a longer one over two pages.");
  l.push("- Moodboard: four to six photos in its gallery, the palette as the project's hex colours, the main materials.");
  l.push("- Caption for a document: the short message to send with the PDF (an e-mail to the client, or a post announcing the guide), plain text.");
  l.push("");
  l.push("## Presentations (16:9 slides, exported as PowerPoint or PDF)");
  l.push("- Slides Rebeca talks over, or sends: one idea per slide, few words, large type. A text slide (doc-page) holds at most about 600 characters, in short lines or bullets; a list, a checklist or a table at most eight rows; spread longer content over several slides.");
  l.push("- Every slide has speaker notes (notes): what Rebeca says on that slide, two to five sentences in French in her voice, as she would speak. The slide shows the key words; the notes carry the argument, the examples and the transition to the next slide. Notes are null for every other format.");
  l.push("- Structure: a cover (doc-cover, often with a photo), an agenda (deck-agenda) when there are three parts or more, a section divider (deck-section, numbered 01, 02…) before each part, two to four slides per part, then the closing slide (doc-closing). Eight to sixteen slides. Alternate cream and paper grounds; section dividers on stone.");
  l.push("- Corporate deck (deck-corporate): « Préparé pour » the company on the cover. A proposal: the context (what is at stake for them), key figures (only figures she gave, each with its source), the programme of the Home & Life Balance workshop (a table or a page), the offer (price « Sur devis » unless she gives one), the closing slide. The workshop itself: advice slides (text, photo, checklist), a quote, the closing slide.");
  l.push("- Client presentation (deck-client): for one client she names, written to them (« vous »): the intention, the moodboard (gallery, palette, materials), photo slides, the shopping list (table), the next steps, the closing slide. Never invent products, shops, prices or links: write « à compléter ».");
  l.push("- Caption for a presentation: the short e-mail to send with the deck, plain text.");
  l.push("- A slide with the template « free » was laid out by hand by Rebeca (blocks she placed herself). When editing, return it with layout « free », its basedOn number and no fields: the studio keeps it exactly as it is. Never create a free slide yourself.");
  l.push("");
  l.push("## Photos");
  const withPhoto = (kind: "required" | "optional") => LAYOUTS.filter((t) => t.image === kind).map((t) => t.id).join(", ");
  l.push(`Templates with a photo: ${withPhoto("required")} (required) and ${withPhoto("optional")} (optional). For the others set photo.source to « none ». The moodboard uses its gallery (a list of photos with the same sources); every other template has an empty gallery.`);
  l.push("- Two social photo templates. « photo » fills the top of the slide with the photo and crops it to that frame (Rebeca can move the focal point afterwards). « photo-full » shows the photo whole, never cropped or zoomed, and sets the title and text under it on the ground; the layout follows the photo's proportions (a wide photo fills the width, a tall one is shown smaller within the margins). Use photo-full whenever she asks to see the whole photo or not to crop it (« la photo entière », « en entier », « sans couper / recadrer », « ne pas rogner »), and for a real photo of her library whose framing matters: a portrait, a before/after or a detail she composed herself. Otherwise photo. A generated photo is made at the exact shape of its frame, so with photo-full it looks like photo: prefer photo-full for her own photos.");
  l.push("- « library »: one of her images listed in the request, by its id. Real photos of Rebeca are the brand's strongest images: use them for personal topics, her story, her work.");
  l.push(`- « generate »: write an English prompt for Flux 2 (60 to 120 words: the scene, the light, the materials, the camera; end with « no people, no text, no logos »). At most ${MAX_GENERATED_PHOTOS} per social visual, ${MAX_GENERATED_PHOTOS_DOCUMENT} per document or presentation.`);
  l.push("- « keep »: when editing, keep the slide's current photo.");
  l.push(PHOTO_BRIEF);
  return l.join("\n");
}

export const COMPOSE_GUIDE = buildGuide();

// ——— Output schema ———

const ids = <T extends string>(xs: readonly T[]) => xs as unknown as [T, ...T[]];
const FORMAT_IDS = ids(ALL_FORMATS.map((f) => f.id));
const LAYOUT_IDS = ids(LAYOUTS.map((t) => t.id));
const GROUND_IDS = ids(GROUNDS.map((g) => g.id));
const UNIVERSE_IDS = ids([...UNIVERSES.map((u) => u.id), "none"]);

const PhotoOut = z.object({
  source: z.enum(["none", "keep", "library", "generate"]),
  mediaId: z.string().nullable(),
  prompt: z.string().nullable().describe("English prompt for Flux 2 when source is generate"),
});

const SlideOut = z.object({
  basedOn: z.number().int().nullable().describe("When editing: the number of the current slide this one comes from, or null for a new slide"),
  layout: z.enum(LAYOUT_IDS),
  ground: z.enum(GROUND_IDS),
  fields: z.array(z.object({ key: z.string(), value: z.string() })),
  photo: PhotoOut,
  gallery: z.array(PhotoOut).describe("Moodboard photos; empty for every other template"),
  notes: z.string().nullable().describe("Presentations only: the speaker notes of this slide, in French; null for every other format"),
});

const ComposeSchema = z.object({
  title: z.string(),
  formatId: z.enum(FORMAT_IDS),
  universe: z.enum(UNIVERSE_IDS),
  slides: z.array(SlideOut),
  caption: z.string(),
  notes: z.array(z.string()),
});

export type Proposal = {
  title: string;
  formatId: string;
  universe: string | null;
  content: AssetContent;
  notes: string[];
  /** Photos to generate, with the prompt Claude wrote: a slide's photo, or one cell of a moodboard. */
  generate: { slideId: string; prompt: string; galleryIndex?: number }[];
};

// ——— Request helpers ———

function libraryList(media: Media[]): string {
  const sorted = [...media].sort((a, b) => Number(a.isAi) - Number(b.isAi) || b.createdAt.localeCompare(a.createdAt)).slice(0, 60);
  if (!sorted.length) return "Her image library is empty.";
  const shape = (m: Media) => (m.width > m.height * 1.15 ? "landscape" : m.height > m.width * 1.15 ? "portrait" : "square");
  return ["Her image library (id: description):", ...sorted.map((m) => `- ${m.id}: ${m.label || "untitled"} — ${m.isAi ? "AI image" : "real photo"}, ${shape(m)}`)].join("\n");
}

function photoRule(images: CreateOptions["images"]): string {
  switch (images) {
    case "none":
      return `Photos: none. Do not use templates that need a photo (${LAYOUTS.filter((t) => t.image === "required" || t.image === "gallery").map((t) => t.id).join(", ")}); covers without a photo.`;
    case "library":
      return "Photos: only from her library (photo.source « library »). Never « generate ».";
    case "ai":
      return `Photos: generate them (photo.source « generate »), at most ${MAX_GENERATED_PHOTOS}. Use the photo template where a photo helps the message.`;
    default:
      return `Photos: use the photo template only where a photo really helps. Prefer an image of her library when one fits (real photos first); otherwise generate one (at most ${MAX_GENERATED_PHOTOS}). A visual without photos is fine.`;
  }
}

// ——— Turning Claude's answer into studio content ———

// Field names that carry the same text in another template, used when a slide changes template.
const ALIASES: Record<string, string[]> = {
  body: ["text", "subtitle", "description", "intro"],
  text: ["body", "subtitle", "description", "intro"],
  subtitle: ["text", "body", "intro"],
  intro: ["subtitle", "text"],
  items: ["included", "materials"],
  included: ["items"],
  value1: ["value"],
  text1: ["text"],
  source1: ["source"],
  value: ["value1"],
  source: ["source1"],
};

function normalize(
  out: z.infer<typeof ComposeSchema>,
  ctx: { format: Format; media: Media[]; existing: Asset | null; images: CreateOptions["images"] },
): Proposal {
  const { format, existing } = ctx;
  const doc = isDocument(format);
  const deck = isDeck(format);
  // Documents and presentations share the page templates and the photo allowance.
  const paged = doc || deck;
  const maxPhotos = paged ? MAX_GENERATED_PHOTOS_DOCUMENT : MAX_GENERATED_PHOTOS;
  const mediaIds = new Set(ctx.media.map((m) => m.id));
  const notes = [...out.notes];
  let slidesOut = out.slides;
  if (!format.multi && slidesOut.length > 1) slidesOut = slidesOut.slice(0, 1);
  if (slidesOut.length > format.maxSlides) slidesOut = slidesOut.slice(0, format.maxSlides);
  const none = { source: "none" as const, mediaId: null, prompt: null };
  if (!slidesOut.length) slidesOut = [{ basedOn: null, layout: paged ? "doc-cover" : "cover", ground: "cream", fields: [], photo: none, gallery: [], notes: null }];

  const usedIds = new Set<string>();
  const generate: Proposal["generate"] = [];
  const canGenerate = ctx.images !== "none" && ctx.images !== "library";

  // Resolves one photo choice; a « generate » is queued and returns null until the photo arrives.
  const resolve = (p: z.infer<typeof PhotoOut>, slideId: string, galleryIndex: number | undefined, label: string): { image: ImageRef | null; prompt: string | null } => {
    if (p.source === "library" && p.mediaId && mediaIds.has(p.mediaId)) return { image: { mediaId: p.mediaId, focusX: 50, focusY: 35, zoom: 1 }, prompt: null };
    if (p.source === "generate" && p.prompt?.trim() && canGenerate) {
      if (generate.length < maxPhotos) {
        generate.push({ slideId, prompt: p.prompt.trim(), ...(galleryIndex !== undefined ? { galleryIndex } : {}) });
        return { image: null, prompt: p.prompt.trim() };
      }
      notes.push(`${label} not generated: ${maxPhotos} at most per request.`);
    }
    return { image: null, prompt: null };
  };

  const slides: Slide[] = slidesOut.map((s, index) => {
    const base = existing && s.basedOn ? existing.content.slides[s.basedOn - 1] : undefined;
    // A slide Rebeca laid out by hand stays exactly as she left it: Claude can only keep it (or drop it).
    if (s.layout === "free" && base?.layout === "free" && !usedIds.has(base.id)) {
      usedIds.add(base.id);
      const notes = s.notes?.trim();
      return { ...structuredClone(base), ...(deck && notes ? { notes } : {}) };
    }
    // Social visuals use social templates, documents use pages; « No photos » means no template that needs one.
    let layout = equivalentLayout(s.layout === "free" ? "doc-page" : (s.layout as LayoutId), format);
    if (ctx.images === "none" && getLayout(layout).image === "required") layout = paged ? "doc-page" : "text";
    const slide = newSlide(layout, s.ground as GroundId);
    if (base && !usedIds.has(base.id)) slide.id = base.id;
    usedIds.add(slide.id);
    const def = getLayout(slide.layout);
    const given = new Map(s.fields.map((f) => [f.key, f.value.trim()]));
    for (const f of def.fields) {
      const direct = given.get(f.key);
      const alias = (ALIASES[f.key] ?? []).map((k) => given.get(k)).find((v) => v);
      const value = direct || (def.id !== s.layout ? alias : undefined);
      if (value) slide.fields[f.key] = value;
    }
    // Speaker notes travel with presentation slides; when editing, a slide keeps its notes unless Claude rewrote them.
    if (deck) {
      const notes = s.notes?.trim();
      if (notes) slide.notes = notes;
      else if (base?.notes) slide.notes = base.notes;
    }
    const unit = doc ? "page" : "slide";

    if (def.image === "required" || def.image === "optional") {
      const p = s.photo;
      if (p.source === "keep" && base?.image) {
        slide.image = base.image;
        slide.photoPrompt = base.photoPrompt ?? null;
      } else if (p.source === "keep" && base?.photoJob) {
        slide.photoJob = base.photoJob;
        slide.photoPrompt = base.photoPrompt ?? null;
      } else {
        const r = resolve(p, slide.id, undefined, `Photo of ${unit} ${index + 1}`);
        slide.image = r.image;
        if (r.prompt) slide.photoPrompt = r.prompt;
      }
    }

    if (def.image === "gallery" && ctx.images !== "none") {
      const items: GalleryItem[] = [];
      s.gallery.slice(0, MAX_GALLERY).forEach((g, gi) => {
        const kept = g.source === "keep" ? base?.gallery?.[gi] : undefined;
        if (kept) return items.push(kept);
        const r = resolve(g, slide.id, items.length, `Moodboard photo ${gi + 1} of ${unit} ${index + 1}`);
        if (r.image || r.prompt) items.push({ image: r.image, photoPrompt: r.prompt });
      });
      slide.gallery = items;
    }
    return slide;
  });

  const universe = out.universe === "none" ? null : out.universe;
  return {
    title: out.title.trim() || "Untitled",
    formatId: format.id,
    universe,
    content: {
      slides,
      caption: out.caption.trim(),
      options: existing ? existing.content.options : { ...DEFAULT_OPTIONS, universeTag: isSocial(format) && format.multi && Boolean(universe) },
    },
    notes: notes.slice(0, 6),
    generate,
  };
}

// ——— Public functions ———

/** Create options as sent by the UI, made safe. */
export function parseOptions(b: Record<string, unknown>): CreateOptions {
  const images = ["auto", "none", "library", "ai"].includes(String(b.images)) ? (b.images as CreateOptions["images"]) : "auto";
  const slides = Number(b.slides);
  return {
    formatId: typeof b.formatId === "string" && b.formatId ? b.formatId : "auto",
    universe: typeof b.universe === "string" && b.universe ? b.universe : "auto",
    images,
    slides: slides >= 2 && slides <= 20 ? Math.round(slides) : null,
  };
}


export async function composeFromPrompt(prompt: string, options: CreateOptions, media: Media[]): Promise<Proposal> {
  const fixed = options.formatId !== "auto" ? getFormat(options.formatId) : null;
  // Portrait is only the default orientation of the picker: her prompt may ask for the other one.
  const turned = fixed && isDocument(fixed) ? withOrientation(fixed, !isLandscape(fixed)) : null;
  const user = [
    "Rebeca's prompt:",
    prompt.trim(),
    "",
    fixed
      ? `Format: ${fixed.id} (chosen by her, keep it${turned ? `; ${turned.id} if her prompt asks for the document in ${isLandscape(turned) ? "landscape" : "portrait"}` : ""}).`
      : "Format: choose the one that suits her request best (a carousel for several points or figures, a post for one idea, a story for a quick tip or announcement). If she names a platform, stay on it.",
    options.universe === "auto" ? "Universe: choose the one her request belongs to, or none." : `Universe: ${options.universe} (chosen by her).`,
    fixed?.multi || !fixed ? (options.slides ? `Number of slides or pages: ${options.slides}, if the format has several.` : "") : "",
    photoRule(options.images),
    options.images === "none" || options.images === "ai" ? "" : libraryList(media),
    "",
    "Write everything in French (France), except the names that stay in English.",
  ]
    .filter(Boolean)
    .join("\n");
  const out = await structured({ schema: ComposeSchema, operation: "compose", user, effort: "medium", guide: COMPOSE_GUIDE });
  const format = turned && out.formatId === turned.id ? turned : (fixed ?? getFormat(out.formatId));
  return normalize(out, { format, media, existing: null, images: options.images });
}

export async function editWithPrompt(asset: Asset, instruction: string, media: Media[]): Promise<Proposal> {
  const format = getFormat(asset.formatId);
  // A document may change orientation when she asks for it; nothing else changes format here.
  const turned = isDocument(format) ? withOrientation(format, !isLandscape(format)) : null;
  const user = [
    "Here is a visual Rebeca is working on. She asks for a change:",
    instruction.trim(),
    "",
    `Return the whole visual with the change made. Keep everything she did not ask to change exactly as it is: same text, same templates, same order, and photo source « keep » for photos that stay. For each slide, basedOn is the number of the current slide it comes from (null for a new slide).${isDeck(format) ? " Return each slide's speaker notes too, as they are unless she asks to change them." : ""}`,
    turned
      ? `Keep the format ${format.id}, unless she asks for the document in ${isLandscape(turned) ? "landscape" : "portrait"}: then use ${turned.id}.`
      : `Keep the format ${format.id}.`,
    "",
    describeAsset(asset, null),
    `Caption: ${JSON.stringify(asset.content.caption)}`,
    "",
    photoRule("auto"),
    libraryList(media),
  ].join("\n");
  const out = await structured({ schema: ComposeSchema, operation: "edit", user, effort: "medium", guide: COMPOSE_GUIDE, assetId: asset.id });
  const chosen = turned && out.formatId === turned.id ? turned : format;
  const p = normalize({ ...out, formatId: chosen.id }, { format: chosen, media, existing: asset, images: "auto" });
  return { ...p, title: asset.title, universe: asset.universe };
}

export async function regenerateFromPrompt(asset: Asset, prompt: string, media: Media[]): Promise<Proposal> {
  const options: CreateOptions = { ...(asset.promptOptions ?? { universe: "auto", images: "auto", slides: null }), formatId: asset.formatId };
  const p = await composeFromPrompt(prompt, options, media);
  // Same asset: keep its options (logo, page numbers…).
  return { ...p, content: { ...p.content, options: asset.content.options } };
}

// ——— Improve the prompt itself ———

const ImprovedPrompt = z.object({
  prompt: z.string().describe("The improved prompt, in the language she wrote in"),
  added: z.array(z.string()).describe("Two to four short notes in English: what you added or clarified"),
});

export async function improvePrompt(prompt: string, options: CreateOptions) {
  const user = [
    "Rebeca wrote the prompt below to create a visual with the studio. Rewrite it into a clear, complete brief that the studio's AI can follow well, so the result needs fewer corrections.",
    "- Keep her language (French if she wrote in French) and her intention.",
    "- Keep every fact, figure, source, name and wording she gave, verbatim.",
    "- Make explicit what helps: the goal, who it speaks to, the format and number of slides if relevant, the message of each slide in order, the tone, the call to action, and what the photos should show (or that there are none).",
    "- Never invent figures or sources: where a figure would help, write « [chiffre à fournir, avec sa source] ».",
    "- 200 words at most. Plain text, short lines or a short list.",
    "",
    `Her choices: format ${options.formatId === "auto" ? "to be chosen" : options.formatId}, universe ${options.universe}, photos ${options.images}${options.slides ? `, ${options.slides} slides` : ""}.`,
    "",
    "Her prompt:",
    prompt.trim(),
  ].join("\n");
  return structured({ schema: ImprovedPrompt, operation: "prompt", user, effort: "low", guide: COMPOSE_GUIDE });
}

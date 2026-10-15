// From Rebeca's prompt to a finished visual: Claude chooses the format and the templates, writes
// every text and caption, and writes a photo prompt where a photo helps. The studio then sets the
// text in the brand fonts and Flux generates the photos. Text is never drawn by an image model.
import { z } from "zod";
import type { Asset, CreateOptions, Media } from "@/lib/db/schema";
import { DEFAULT_OPTIONS, type AssetContent, type GroundId, type LayoutId, type Slide } from "@/lib/content";
import { FORMATS, getFormat, type Format } from "@/lib/brand/formats";
import { LAYOUTS, getLayout, newSlide } from "@/lib/brand/layouts";
import { GROUNDS, UNIVERSES } from "@/lib/brand/tokens";
import { PHOTO_BRIEF } from "@/lib/brand/voice";
import { describeAsset, structured } from "@/lib/ai/claude";

export const MAX_GENERATED_PHOTOS = 4;

// ——— The guide: everything Claude needs to know about the studio, built from the code so it never drifts ———

function buildGuide(): string {
  const l: string[] = [];
  l.push("# Making a visual in the studio");
  l.push("Rebeca describes what she wants. You return the finished visual as data: the studio lays out your text in the brand's templates, fonts and colours, and an image model generates the photos you describe. You never draw text into images.");
  l.push("");
  l.push("## Formats");
  for (const f of FORMATS) l.push(`- ${f.id}: ${f.platform} ${f.name.toLowerCase()}, ${f.width}×${f.height}, ${f.multi ? `carousel of up to ${f.maxSlides} slides` : "a single image (exactly one slide)"}. ${f.hint}`);
  l.push("");
  l.push("## Templates (each slide uses one)");
  for (const t of LAYOUTS) {
    l.push(`### ${t.id} — ${t.name}: ${t.description}${t.image === "required" ? " The only template with a photo." : ""}`);
    for (const f of t.fields) {
      const limit = f.kind === "list" ? `max ${f.max} items, one per line` : `max ${f.max} characters`;
      const kind = f.kind === "title" ? "title (*italic* allowed, \\n for a line break)" : f.kind === "text" ? "paragraph (*italic*, **bold** allowed)" : f.kind === "list" ? "list" : "single line";
      l.push(`- ${f.key}: ${f.label}, ${kind}, ${limit}, ${f.optional ? "optional" : "required"}. Example: ${JSON.stringify(f.placeholder)}${f.help ? `. ${f.help}` : ""}`);
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
  l.push("- Eyebrows: a short noun phrase, usually the same on every slide of a carousel (for example the theme, or « 01 — Décoration »).");
  l.push("- Titles: one *italic* phrase for the warm or emotional words, ending with a full stop (questions keep their question mark).");
  l.push("- Her own words come first: when she gives wording, keep it verbatim where it fits; only fix typos and fit it to the limits. When she gives a topic, write the copy yourself, in her voice.");
  l.push("- Figures: only the figures she gave, with the source and year she gave. Never invent a number, a study, a source or a testimonial. If she asks for figures without giving them, use other templates and say so in the notes.");
  l.push("- Every required field is filled and every text stays within its limit.");
  l.push("- Caption: the post text published with the visual, plain text without asterisks or emoji. LinkedIn: a hook on the first line, short paragraphs, 600 to 1 200 characters, at most three hashtags at the end. Instagram: 300 to 900 characters, « Lien en bio », up to five hashtags. Facebook: 300 to 800 characters, no hashtags needed.");
  l.push("- Title of the asset: a short working title in French for her library.");
  l.push("- Notes: two to five short notes in English for Rebeca: the choices you made, and anything she should check or provide.");
  l.push("");
  l.push("## Photos");
  l.push("Only the photo template shows a photo; for every other template set photo.source to « none ».");
  l.push("- « library »: one of her images listed in the request, by its id. Real photos of Rebeca are the brand's strongest images: use them for personal topics, her story, her work.");
  l.push(`- « generate »: write an English prompt for Flux 2 (60 to 120 words: the scene, the light, the materials, the camera; end with « no people, no text, no logos »). At most ${MAX_GENERATED_PHOTOS} per visual.`);
  l.push("- « keep »: when editing, keep the slide's current photo.");
  l.push(PHOTO_BRIEF);
  return l.join("\n");
}

export const COMPOSE_GUIDE = buildGuide();

// ——— Output schema ———

const ids = <T extends string>(xs: readonly T[]) => xs as unknown as [T, ...T[]];
const FORMAT_IDS = ids(FORMATS.map((f) => f.id));
const LAYOUT_IDS = ids(LAYOUTS.map((t) => t.id));
const GROUND_IDS = ids(GROUNDS.map((g) => g.id));
const UNIVERSE_IDS = ids([...UNIVERSES.map((u) => u.id), "none"]);

const SlideOut = z.object({
  basedOn: z.number().int().nullable().describe("When editing: the number of the current slide this one comes from, or null for a new slide"),
  layout: z.enum(LAYOUT_IDS),
  ground: z.enum(GROUND_IDS),
  fields: z.array(z.object({ key: z.string(), value: z.string() })),
  photo: z.object({
    source: z.enum(["none", "keep", "library", "generate"]),
    mediaId: z.string().nullable(),
    prompt: z.string().nullable().describe("English prompt for Flux 2 when source is generate"),
  }),
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
  /** Slides whose photo is to be generated, with the prompt Claude wrote. */
  generate: { slideId: string; prompt: string }[];
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
      return "Photos: none. Do not use the photo template.";
    case "library":
      return "Photos: only from her library (photo.source « library »). Never « generate ».";
    case "ai":
      return `Photos: generate them (photo.source « generate »), at most ${MAX_GENERATED_PHOTOS}. Use the photo template where a photo helps the message.`;
    default:
      return `Photos: use the photo template only where a photo really helps. Prefer an image of her library when one fits (real photos first); otherwise generate one (at most ${MAX_GENERATED_PHOTOS}). A visual without photos is fine.`;
  }
}

// ——— Turning Claude's answer into studio content ———

function normalize(
  out: z.infer<typeof ComposeSchema>,
  ctx: { format: Format; media: Media[]; existing: Asset | null; images: CreateOptions["images"] },
): Proposal {
  const { format, existing } = ctx;
  const mediaIds = new Set(ctx.media.map((m) => m.id));
  const notes = [...out.notes];
  let slidesOut = out.slides;
  if (!format.multi && slidesOut.length > 1) slidesOut = slidesOut.slice(0, 1);
  if (slidesOut.length > format.maxSlides) slidesOut = slidesOut.slice(0, format.maxSlides);
  if (!slidesOut.length) slidesOut = [{ basedOn: null, layout: "cover", ground: "cream", fields: [], photo: { source: "none", mediaId: null, prompt: null } }];

  const usedIds = new Set<string>();
  const generate: Proposal["generate"] = [];
  const slides: Slide[] = slidesOut.map((s, index) => {
    const base = existing && s.basedOn ? existing.content.slides[s.basedOn - 1] : undefined;
    // « No photos » means no photo template: such a slide becomes a text point.
    const noPhoto = ctx.images === "none" && s.layout === "photo";
    const slide = newSlide(noPhoto ? "text" : (s.layout as LayoutId), s.ground as GroundId);
    if (noPhoto) s = { ...s, fields: s.fields.map((f) => (f.key === "text" ? { ...f, key: "body" } : f)) };
    if (base && !usedIds.has(base.id)) slide.id = base.id;
    usedIds.add(slide.id);
    const def = getLayout(slide.layout);
    for (const f of s.fields) if (def.fields.some((d) => d.key === f.key)) slide.fields[f.key] = f.value.trim();

    if (def.image === "required") {
      const p = s.photo;
      if (p.source === "keep" && base?.image) {
        slide.image = base.image;
        slide.photoPrompt = base.photoPrompt ?? null;
      } else if (p.source === "keep" && base?.photoJob) {
        slide.photoJob = base.photoJob;
        slide.photoPrompt = base.photoPrompt ?? null;
      } else if (p.source === "library" && p.mediaId && mediaIds.has(p.mediaId)) {
        slide.image = { mediaId: p.mediaId, focusX: 50, focusY: 35, zoom: 1 };
      } else if (p.source === "generate" && p.prompt?.trim() && ctx.images !== "none" && ctx.images !== "library") {
        if (generate.length < MAX_GENERATED_PHOTOS) {
          slide.photoPrompt = p.prompt.trim();
          generate.push({ slideId: slide.id, prompt: slide.photoPrompt });
        } else notes.push(`Photo of slide ${index + 1} not generated: ${MAX_GENERATED_PHOTOS} at most per request.`);
      }
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
      options: existing ? existing.content.options : { ...DEFAULT_OPTIONS, universeTag: format.multi && Boolean(universe) },
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
  const user = [
    "Rebeca's prompt:",
    prompt.trim(),
    "",
    fixed
      ? `Format: ${fixed.id} (chosen by her, keep it).`
      : "Format: choose the one that suits her request best (a carousel for several points or figures, a post for one idea, a story for a quick tip or announcement). If she names a platform, stay on it.",
    options.universe === "auto" ? "Universe: choose the one her request belongs to, or none." : `Universe: ${options.universe} (chosen by her).`,
    fixed?.multi || !fixed ? (options.slides ? `Number of slides: ${options.slides} if it is a carousel.` : "") : "",
    photoRule(options.images),
    options.images === "none" || options.images === "ai" ? "" : libraryList(media),
    "",
    "Write everything in French (France), except the names that stay in English.",
  ]
    .filter(Boolean)
    .join("\n");
  const out = await structured({ schema: ComposeSchema, operation: "compose", user, effort: "medium", guide: COMPOSE_GUIDE });
  return normalize(out, { format: fixed ?? getFormat(out.formatId), media, existing: null, images: options.images });
}

export async function editWithPrompt(asset: Asset, instruction: string, media: Media[]): Promise<Proposal> {
  const format = getFormat(asset.formatId);
  const user = [
    "Here is a visual Rebeca is working on. She asks for a change:",
    instruction.trim(),
    "",
    "Return the whole visual with the change made. Keep everything she did not ask to change exactly as it is: same text, same templates, same order, and photo source « keep » for photos that stay. For each slide, basedOn is the number of the current slide it comes from (null for a new slide).",
    `Keep the format ${format.id}.`,
    "",
    describeAsset(asset, null),
    `Caption: ${JSON.stringify(asset.content.caption)}`,
    "",
    photoRule("auto"),
    libraryList(media),
  ].join("\n");
  const out = await structured({ schema: ComposeSchema, operation: "edit", user, effort: "medium", guide: COMPOSE_GUIDE, assetId: asset.id });
  const p = normalize({ ...out, formatId: format.id }, { format, media, existing: asset, images: "auto" });
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

// Claude helps with the words; Rebeca keeps the last word. Every call returns structured
// data the UI shows as a proposal she accepts or not.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Asset } from "@/lib/db/schema";
import { getFormat } from "@/lib/brand/formats";
import { getLayout, imageFrame } from "@/lib/brand/layouts";
import { languageOf } from "@/lib/content";
import { universe } from "@/lib/brand/tokens";
import { BRAND_BRIEF, languageRule, PHOTO_BRIEF } from "@/lib/brand/voice";
import { PHOTO_PRESETS } from "@/lib/brand/image-presets";
import { CLAUDE_MODEL, priceFor, tokenCost } from "@/lib/ai/pricing";
import { recordCost, type Operation } from "@/lib/costs";
import { getSettings } from "@/lib/settings";
import { MissingKeyError, UserFacingError } from "@/lib/errors";

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingKeyError("anthropic");
  return new Anthropic();
}

export async function structured<T extends z.ZodType>(opts: {
  schema: T;
  operation: Operation;
  user: string;
  effort: "low" | "medium" | "high";
  assetId?: string | null;
  /** A second stable system block (the composition guide), cached after the brand brief. */
  guide?: string;
}): Promise<z.infer<T>> {
  let res;
  try {
    res = await client().beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The brand brief (and the guide) never change between calls, so they are cached.
      system: [
        { type: "text", text: BRAND_BRIEF, cache_control: { type: "ephemeral" } },
        ...(opts.guide ? [{ type: "text" as const, text: opts.guide, cache_control: { type: "ephemeral" as const } }] : []),
      ],
      messages: [{ role: "user", content: opts.user }],
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new UserFacingError("The Anthropic key was refused. Check ANTHROPIC_API_KEY in .env.", 401);
    if (err instanceof Anthropic.RateLimitError) throw new UserFacingError("Claude is busy (rate limit). Try again in a minute.", 429);
    if (err instanceof Anthropic.APIConnectionError) throw new UserFacingError("Could not reach Claude. Check the internet connection.", 503);
    throw err;
  }

  const u = res.usage;
  const usage = {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
  };
  const model = res.model || CLAUDE_MODEL;
  recordCost({
    provider: "anthropic",
    model,
    operation: opts.operation,
    quantity: { inputTokens: usage.input, outputTokens: usage.output, cacheWriteTokens: usage.cacheWrite, cacheReadTokens: usage.cacheRead },
    costUsd: tokenCost(priceFor(model, getSettings().prices) ?? priceFor(CLAUDE_MODEL), usage),
    assetId: opts.assetId,
    externalId: res.id,
  });

  if (res.stop_reason === "refusal") throw new UserFacingError("Claude declined this request. Try rephrasing it.", 422);
  if (res.stop_reason === "max_tokens") throw new UserFacingError("Claude’s answer was cut off. Try a smaller part of the asset.", 422);
  if (!res.parsed_output) throw new UserFacingError("Claude’s answer could not be read. Try again.", 502);
  return res.parsed_output;
}

// ——— Describing an asset to Claude ———

export function describeAsset(asset: Asset, onlySlide: number | null): string {
  const format = getFormat(asset.formatId);
  const uni = universe(asset.universe);
  const lines: string[] = [];
  lines.push(`Format: ${format.platform} ${format.name.toLowerCase()} (${format.width}×${format.height}${format.multi ? `, ${asset.content.slides.length} slides` : ""}).`);
  lines.push(`Universe: ${uni ? `${uni.number} — ${uni.short} (${uni.name})` : "none in particular"}.`);
  lines.push(`Language of the visual: ${languageOf(asset.content.options) === "en" ? "English (UK)" : "French (France)"}.`);
  lines.push(`Working title: ${asset.title}`);
  lines.push("");
  asset.content.slides.forEach((slide, i) => {
    if (onlySlide !== null && i !== onlySlide) return;
    if (slide.layout === "free") {
      lines.push(`Slide ${i + 1} — laid out by hand by Rebeca (template free « Blank slide »): keep it exactly as it is. Its content:`);
      for (const b of slide.blocks ?? []) {
        if (b.type === "text" && b.text.trim()) lines.push(`  - ${b.style}: ${JSON.stringify(b.text)}`);
        else if (b.type === "image") lines.push(`  - photo${b.image ? "" : " (empty)"}`);
        else if (b.type === "table") lines.push(`  - table: ${JSON.stringify(b.rows)}`);
      }
      if (slide.notes?.trim()) lines.push(`  speaker notes: ${JSON.stringify(slide.notes.trim())}`);
      return;
    }
    const def = getLayout(slide.layout);
    lines.push(`${format.shape === "a4" ? "Page" : "Slide"} ${i + 1} — template ${def.id} « ${def.name} »: ${def.description}`);
    for (const f of def.fields) {
      const limit = f.kind === "list" ? `max ${f.max} items, one per line` : f.kind === "table" ? `max ${f.max} rows, cells separated by |` : `max ${f.max} characters`;
      const kind =
        f.kind === "title"
          ? "title (Fraunces display; *italic* allowed; Enter = line break)"
          : f.kind === "text"
            ? "paragraph"
            : f.kind === "rich"
              ? "rich text (## subheadings, - bullets, 1. steps)"
              : f.kind === "table"
                ? "table"
                : f.kind === "list"
                  ? "list"
                  : "single line";
      lines.push(`  - ${f.key} · ${f.label} · ${kind} · ${limit}${f.optional ? " · optional" : " · required"}: ${JSON.stringify(slide.fields[f.key] ?? "")}`);
    }
    if (slide.image) lines.push(`  photo: yes${slide.photoPrompt ? ` (generated from: ${JSON.stringify(slide.photoPrompt)})` : ""}`);
    else if (slide.photoJob) lines.push("  photo: being generated");
    if (slide.gallery?.length) lines.push(`  moodboard gallery: ${slide.gallery.length} photo${slide.gallery.length > 1 ? "s" : ""}${slide.gallery.some((g) => g.photoJob) ? " (some being generated)" : ""}`);
    if (slide.notes?.trim()) lines.push(`  speaker notes: ${JSON.stringify(slide.notes.trim())}`);
  });
  return lines.join("\n");
}

// ——— Improve the text ———

const ImproveSchema = z.object({
  slides: z.array(
    z.object({
      slide: z.number().int().describe("Slide number, starting at 1"),
      fields: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
  caption: z.string().nullable().describe("Improved caption, or null if there was none to improve"),
  notes: z.array(z.string()).describe("Up to five short notes in English on what changed and why"),
});

export async function improveText(asset: Asset, opts: { slide: number | null; instruction: string; includeCaption: boolean }) {
  const format = getFormat(asset.formatId);
  const user = [
    "Rebeca wrote the text below for a visual. Improve it and fit it to the template.",
    opts.instruction.trim() ? `Her request: ${opts.instruction.trim()}` : "She gave no particular request.",
    opts.slide !== null ? `Only work on slide ${opts.slide + 1}.` : "Work on every slide; keep a consistent voice across the carousel.",
    "",
    describeAsset(asset, opts.slide),
    "",
    opts.includeCaption
      ? `Caption (the post text published with the visual on ${format.platform}): ${JSON.stringify(asset.content.caption)}`
      : "Leave the caption out (return null).",
    "",
    "Return every field of every slide you worked on, with its key exactly as given, improved or unchanged. Leave optional fields empty if she left them empty. Notes in English.",
    languageRule(languageOf(asset.content.options)),
  ].join("\n");
  const out = await structured({ schema: ImproveSchema, operation: "improve", user, effort: "medium", assetId: asset.id });

  // Keep only fields that exist on the slide's template.
  const slides = out.slides
    .map((s) => {
      const index = s.slide - 1;
      const slide = asset.content.slides[index];
      if (!slide) return null;
      const keys = new Set(getLayout(slide.layout).fields.map((f) => f.key));
      const fields: Record<string, string> = {};
      for (const f of s.fields) if (keys.has(f.key)) fields[f.key] = f.value;
      return { index, fields };
    })
    .filter((s): s is { index: number; fields: Record<string, string> } => s !== null);
  return { slides, caption: opts.includeCaption ? out.caption : null, notes: out.notes.slice(0, 5) };
}

// ——— Caption ———

const CaptionSchema = z.object({
  caption: z.string(),
  notes: z.array(z.string()).describe("Up to three short notes in English"),
});

const PLATFORM_CAPTION: Record<string, string> = {
  LinkedIn:
    "LinkedIn post: the first line is the hook (only about 140 characters show before « … voir plus »). Short paragraphs separated by an empty line, 600 to 1 200 characters in all. End with a quiet invitation (spanishmuminparis.com, or « Réserver un appel »). At most three relevant hashtags on the last line.",
  Instagram:
    "Instagram caption: a strong first line, then short lines, 300 to 900 characters. End with « Lien en bio » or an invitation to write to her. Up to five relevant hashtags at the end.",
  Facebook: "Facebook post: two or three short paragraphs, 300 to 800 characters, ending with a quiet invitation and spanishmuminparis.com. No hashtags needed.",
  Document:
    "Message to send with the PDF document. For a client or a company: a short, warm e-mail in « vous » (greeting, what the document contains, the next step, signed « Rebeca »), 400 to 900 characters, no hashtags. For a guide or an offer sheet meant for everyone: a post announcing it (a hook, what is inside, how to get it), 400 to 900 characters, at most three hashtags.",
  Presentation:
    "Message to send with the presentation: a short, warm e-mail in « vous » (greeting, what the deck covers, the next step, signed « Rebeca »), 300 to 700 characters, no hashtags.",
};

export async function writeCaption(asset: Asset, mode: "write" | "improve", instruction: string) {
  const format = getFormat(asset.formatId);
  const user = [
    mode === "improve"
      ? "Rebeca wrote the caption below. Improve it in her voice, keeping her meaning and her words where you can."
      : "Write the caption (the text published or sent with this visual or document) in Rebeca’s voice, from what the slides or pages say. Do not add facts that are not on them.",
    PLATFORM_CAPTION[format.platform] ?? PLATFORM_CAPTION.LinkedIn,
    "Captions use plain text: no *asterisks*, no emoji.",
    languageRule(languageOf(asset.content.options)),
    instruction.trim() ? `Her request: ${instruction.trim()}` : "",
    "",
    describeAsset(asset, null),
    "",
    `Current caption: ${JSON.stringify(asset.content.caption)}`,
  ].join("\n");
  return structured({ schema: CaptionSchema, operation: "caption", user, effort: "medium", assetId: asset.id });
}

// ——— Image prompt ———

const PromptSchema = z.object({
  prompt: z.string().describe("One English prompt for the image model, 60 to 120 words"),
  summary: z.string().describe("One sentence in English describing the image, for Rebeca"),
});

export async function writeImagePrompt(opts: { idea: string; presetId: string | null; width: number; height: number; assetId?: string | null }) {
  const preset = PHOTO_PRESETS.find((p) => p.id === opts.presetId);
  const orientation = opts.width > opts.height * 1.15 ? "landscape" : opts.height > opts.width * 1.15 ? "portrait" : "square";
  const user = [
    "Rebeca needs a photo for one of her visuals. Turn her idea into a prompt for Flux 2, an image model that follows detailed descriptions.",
    PHOTO_BRIEF,
    `The photo fills a ${orientation} frame (${opts.width}×${opts.height}). Compose for it: a clear subject, calm space around it.`,
    preset ? `Starting scene she picked: ${preset.scene}` : "",
    `Her idea (French or English): ${JSON.stringify(opts.idea.trim() || "(none: use the starting scene)")}`,
    "Describe the scene, the light, the materials and the camera (editorial interior photography, medium format). End with: no people, no text, no logos (unless her idea asks for a person; then never a recognisable face).",
  ]
    .filter(Boolean)
    .join("\n");
  return structured({ schema: PromptSchema, operation: "prompt", user, effort: "low", assetId: opts.assetId });
}

// ——— Review ———

const ReviewSchema = z.object({
  summary: z.string().describe("Two sentences in English: overall verdict"),
  comments: z.array(
    z.object({
      slide: z.number().int().nullable().describe("Slide number from 1, or null for the caption or the whole asset"),
      field: z.string().nullable(),
      severity: z.enum(["important", "suggestion"]),
      comment: z.string().describe("In English"),
      suggestion: z.string().nullable().describe("A replacement text in the visual's language, if useful"),
    }),
  ),
});

export async function reviewAsset(asset: Asset) {
  const user = [
    "Review this visual against the Spanish Mum in Paris brand guidelines: voice (Rebeca speaks, warm, practical, reassuring), titles, facts and sources, names, and whether each text fits its template.",
    "Only flag real problems or clear improvements: eight comments at most, the most important first. If it is already right, say so and return no comments.",
    languageRule(languageOf(asset.content.options)),
    "",
    describeAsset(asset, null),
    "",
    `Caption: ${JSON.stringify(asset.content.caption)}`,
  ].join("\n");
  const out = await structured({ schema: ReviewSchema, operation: "review", user, effort: "medium", assetId: asset.id });
  return { ...out, comments: out.comments.slice(0, 8) };
}

export function frameFor(asset: Asset, slideIndex: number) {
  const slide = asset.content.slides[slideIndex];
  return slide ? imageFrame(slide.layout, getFormat(asset.formatId)) : null;
}

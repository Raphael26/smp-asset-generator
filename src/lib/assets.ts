import { and, desc, eq, like, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import type { Asset, CreateOptions } from "@/lib/db/schema";
import { DEFAULT_OPTIONS, type AssetContent } from "@/lib/content";
import { getFormat } from "@/lib/brand/formats";
import { CAROUSEL_STARTERS, SINGLE_STARTERS, slidesFromStarter } from "@/lib/brand/layouts";
import { UserFacingError } from "@/lib/errors";

export function getAsset(id: string): Asset {
  const a = db.select().from(schema.assets).where(eq(schema.assets.id, id)).get();
  if (!a) throw new UserFacingError("This asset no longer exists.", 404);
  return a;
}

export function listAssets(filter: { q?: string; formatId?: string; universe?: string; status?: string } = {}): Asset[] {
  const conds = [];
  if (filter.formatId) conds.push(eq(schema.assets.formatId, filter.formatId));
  if (filter.universe) conds.push(eq(schema.assets.universe, filter.universe));
  if (filter.status) conds.push(eq(schema.assets.status, filter.status));
  if (filter.q) {
    const q = `%${filter.q}%`;
    conds.push(or(like(schema.assets.title, q), like(schema.assets.content, q), like(schema.assets.notes, q))!);
  }
  return db
    .select()
    .from(schema.assets)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.assets.updatedAt))
    .all();
}

export function createAsset(input: { title: string; formatId: string; universe: string | null; starterId: string }): Asset {
  const format = getFormat(input.formatId);
  const starters = format.multi ? CAROUSEL_STARTERS : SINGLE_STARTERS;
  const starter = starters.find((s) => s.id === input.starterId) ?? starters[0];
  const content: AssetContent = {
    slides: slidesFromStarter(starter),
    caption: "",
    options: { ...DEFAULT_OPTIONS, universeTag: Boolean(input.universe) && format.multi },
  };
  const id = nanoid(10);
  db.insert(schema.assets)
    .values({ id, title: input.title.trim() || "Untitled", formatId: format.id, universe: input.universe || null, content })
    .run();
  return getAsset(id);
}

export type AssetPatch = Partial<Pick<Asset, "title" | "universe" | "status" | "content" | "notes" | "publishedAt" | "publishedUrl" | "formatId" | "prompt">>;

export function updateAsset(id: string, patch: AssetPatch): Asset {
  getAsset(id);
  const allowed: AssetPatch = {};
  for (const k of ["title", "universe", "status", "content", "notes", "publishedAt", "publishedUrl", "formatId", "prompt"] as const) {
    if (patch[k] !== undefined) (allowed as Record<string, unknown>)[k] = patch[k];
  }
  if (allowed.status && !["draft", "ready", "published"].includes(allowed.status)) throw new UserFacingError("Unknown status.");
  db.update(schema.assets)
    .set({ ...allowed, updatedAt: new Date().toISOString() })
    .where(eq(schema.assets.id, id))
    .run();
  return getAsset(id);
}

export function duplicateAsset(id: string): Asset {
  const a = getAsset(id);
  const newId = nanoid(10);
  db.insert(schema.assets)
    .values({
      id: newId,
      title: `${a.title} (copy)`,
      formatId: a.formatId,
      universe: a.universe,
      status: "draft",
      content: a.content,
      notes: a.notes,
    })
    .run();
  return getAsset(newId);
}

export function deleteAsset(id: string) {
  db.delete(schema.assets).where(eq(schema.assets.id, id)).run();
}

export function addRevision(assetId: string, reason: string) {
  const a = getAsset(assetId);
  db.insert(schema.assetRevisions).values({ id: nanoid(12), assetId, title: a.title, content: a.content, reason }).run();
}

export function listRevisions(assetId: string) {
  return db
    .select()
    .from(schema.assetRevisions)
    .where(eq(schema.assetRevisions.assetId, assetId))
    .orderBy(desc(schema.assetRevisions.createdAt))
    .all();
}

export function restoreRevision(assetId: string, revisionId: string): Asset {
  const rev = db.select().from(schema.assetRevisions).where(eq(schema.assetRevisions.id, revisionId)).get();
  if (!rev || rev.assetId !== assetId) throw new UserFacingError("Version not found.", 404);
  addRevision(assetId, "Before restoring an older version");
  return updateAsset(assetId, { content: rev.content, title: rev.title });
}

/** A new asset from what Claude composed for a prompt. */
export function createAssetFromContent(input: {
  title: string;
  formatId: string;
  universe: string | null;
  content: AssetContent;
  prompt: string;
  promptOptions: CreateOptions;
  notes?: string;
}): Asset {
  const id = nanoid(10);
  db.insert(schema.assets)
    .values({
      id,
      title: input.title,
      formatId: getFormat(input.formatId).id,
      universe: input.universe,
      content: input.content,
      prompt: input.prompt,
      promptOptions: input.promptOptions,
      notes: input.notes ?? "",
    })
    .run();
  return getAsset(id);
}

/**
 * Puts a finished generated photo into its slide (mediaId null: the generation failed, just clear
 * the pending state). Leaves the slide alone if Rebeca has meanwhile chosen another photo.
 */
export function placePhoto(assetId: string, slideId: string, jobId: string, mediaId: string | null) {
  const a = db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).get();
  if (!a) return;
  let changed = false;
  const slides = a.content.slides.map((s) => {
    if (s.id !== slideId) return s;
    if (s.photoJob !== jobId && s.image) return s;
    changed = true;
    return { ...s, photoJob: null, image: mediaId ? { mediaId, focusX: 50, focusY: 40, zoom: 1 } : s.image };
  });
  if (changed) db.update(schema.assets).set({ content: { ...a.content, slides } }).where(eq(schema.assets.id, assetId)).run();
}

/** Marks slides as waiting for a photo (the editor shows a placeholder until it arrives). */
export function setPhotoJobs(assetId: string, jobs: { slideId: string; jobId: string; prompt: string }[]) {
  const a = getAsset(assetId);
  const slides = a.content.slides.map((s) => {
    const j = jobs.find((x) => x.slideId === s.id);
    return j ? { ...s, photoJob: j.jobId, photoPrompt: j.prompt } : s;
  });
  db.update(schema.assets).set({ content: { ...a.content, slides } }).where(eq(schema.assets.id, assetId)).run();
}

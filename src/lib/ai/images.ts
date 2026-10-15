// Image generation (Flux 2) and upscaling (Topaz) on Replicate, as jobs the UI polls.
// Each poll asks Replicate for the prediction's status, so nothing runs in the background
// and a restart of the app loses nothing.
import fs from "node:fs";
import Replicate from "replicate";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import type { ImageJobRequest, Job } from "@/lib/db/schema";
import { getMedia, mediaPath, saveImage } from "@/lib/media";
import { placePhoto } from "@/lib/assets";
import { recordCost } from "@/lib/costs";
import { getSettings } from "@/lib/settings";
import { imageCost, priceFor, UPSCALE_MODEL, IMAGE_MODELS } from "@/lib/ai/pricing";
import { MissingKeyError, UserFacingError } from "@/lib/errors";

function client(): Replicate {
  const auth = process.env.REPLICATE_API_TOKEN;
  if (!auth) throw new MissingKeyError("replicate");
  return new Replicate({ auth, useFileOutput: false });
}

/** Width and height for Flux (multiples of 16, 256–2048) matching the frame, around 2 megapixels. */
export function generationSize(frameW: number, frameH: number, targetMp = 2): { width: number; height: number } {
  const ratio = frameW / frameH;
  let w = Math.sqrt(targetMp * 1e6 * ratio);
  let h = w / ratio;
  const scale = Math.min(1, 2048 / w, 2048 / h);
  w *= scale;
  h *= scale;
  const r16 = (n: number) => Math.max(256, Math.min(2048, Math.round(n / 16) * 16));
  return { width: r16(w), height: r16(h) };
}

export function estimateGenerationCost(model: string, width: number, height: number, count: number, upscale: boolean): number {
  const prices = getSettings().prices;
  const mp = (width * height) / 1e6;
  const one = imageCost(priceFor(model, prices), mp) + (upscale ? imageCost(priceFor(UPSCALE_MODEL, prices), mp * 4) : 0);
  return one * count;
}

export async function startGeneration(opts: {
  prompt: string;
  idea?: string;
  model: string;
  frameWidth: number;
  frameHeight: number;
  count: number;
  upscale: boolean;
  label?: string;
  assetId?: string | null;
  targetSlideId?: string;
  targetGallery?: number;
}): Promise<Job[]> {
  if (!IMAGE_MODELS.some((m) => m.id === opts.model)) throw new UserFacingError("Unknown image model.");
  const prompt = opts.prompt.trim();
  if (prompt.length < 10) throw new UserFacingError("Describe the image in a few words first.");
  const { width, height } = generationSize(opts.frameWidth, opts.frameHeight);
  const input = { prompt, aspect_ratio: "custom", width, height, output_format: "jpg", output_quality: 95, safety_tolerance: 2 };
  const replicate = client();
  const count = Math.max(1, Math.min(4, Math.round(opts.count)));
  const created: Job[] = [];
  for (let i = 0; i < count; i++) {
    const prediction = await replicate.predictions.create({ model: opts.model, input });
    const request: ImageJobRequest = {
      prompt,
      idea: opts.idea,
      model: opts.model,
      width,
      height,
      upscale: opts.upscale,
      label: opts.label ?? "",
      ...(opts.targetSlideId ? { targetSlideId: opts.targetSlideId } : {}),
      ...(opts.targetGallery !== undefined ? { targetGallery: opts.targetGallery } : {}),
    };
    const job = {
      id: nanoid(12),
      status: "running",
      stage: "generate",
      model: opts.model,
      predictionId: prediction.id,
      input,
      request,
      assetId: opts.assetId ?? null,
    };
    db.insert(schema.jobs).values(job).run();
    created.push(db.select().from(schema.jobs).where(eq(schema.jobs.id, job.id)).get()!);
  }
  return created;
}

export async function startUpscale(mediaId: string, assetId?: string | null): Promise<Job> {
  const source = getMedia(mediaId);
  if (!source) throw new UserFacingError("Image not found.", 404);
  if (source.width * source.height > 6e6) throw new UserFacingError("This image is already large enough.");
  const replicate = client();
  const input = { image: fs.readFileSync(mediaPath(source)), enhance_model: "High Fidelity V2", upscale_factor: "2x", output_format: "jpg" };
  const prediction = await replicate.predictions.create({ model: UPSCALE_MODEL, input });
  const job = {
    id: nanoid(12),
    status: "running",
    stage: "upscale",
    model: UPSCALE_MODEL,
    predictionId: prediction.id,
    input: { enhance_model: input.enhance_model, upscale_factor: input.upscale_factor, image: `media:${source.id}` },
    request: { prompt: source.prompt ?? "", model: UPSCALE_MODEL, width: source.width * 2, height: source.height * 2, upscale: true, label: source.label },
    mediaId: source.id,
    assetId: assetId ?? null,
  };
  db.insert(schema.jobs).values(job).run();
  return db.select().from(schema.jobs).where(eq(schema.jobs.id, job.id)).get()!;
}

const busy = new Set<string>();

async function download(output: unknown): Promise<Buffer> {
  const url = Array.isArray(output) ? output[0] : output;
  if (typeof url !== "string") throw new Error("Replicate returned no image.");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the image (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

function finish(job: Job, patch: Partial<Job>) {
  db.update(schema.jobs)
    .set({ ...patch, completedAt: patch.status && patch.status !== "running" ? new Date().toISOString() : job.completedAt })
    .where(eq(schema.jobs.id, job.id))
    .run();
}

async function advance(job: Job): Promise<void> {
  if (job.status !== "running" || !job.predictionId || busy.has(job.id)) return;
  busy.add(job.id);
  try {
    const replicate = client();
    const prediction = await replicate.predictions.get(job.predictionId);
    if (prediction.status === "starting" || prediction.status === "processing") return;
    if (prediction.status !== "succeeded") {
      const raw = typeof prediction.error === "string" ? prediction.error : prediction.error ? JSON.stringify(prediction.error) : "";
      finish(job, { status: prediction.status === "canceled" ? "canceled" : "failed", error: raw || "The model could not make this image." });
      if (job.assetId && job.request.targetSlideId) placePhoto(job.assetId, job.request.targetSlideId, job.id, null, job.request.targetGallery);
      return;
    }
    const buffer = await download(prediction.output);
    const prices = getSettings().prices;
    const metrics = (prediction.metrics ?? {}) as Record<string, number>;

    if (job.stage === "generate") {
      const req = job.request;
      const mp = metrics.image_output_megapixel_count ?? (req.width * req.height) / 1e6;
      const cost = imageCost(priceFor(job.model, prices), mp);
      const m = await saveImage(buffer, {
        kind: "generated",
        isAi: true,
        label: req.label,
        prompt: req.prompt,
        model: job.model,
        params: { ...job.input, idea: req.idea ?? null },
        costUsd: cost,
      });
      recordCost({ provider: "replicate", model: job.model, operation: "image", quantity: { images: 1, megapixels: mp }, costUsd: cost, assetId: job.assetId, mediaId: m.id, externalId: prediction.id });
      if (req.upscale) {
        const up = await replicate.predictions.create({
          model: UPSCALE_MODEL,
          input: { image: prediction.output as string, enhance_model: "High Fidelity V2", upscale_factor: "2x", output_format: "jpg" },
        });
        finish(job, { stage: "upscale", predictionId: up.id, mediaId: m.id });
      } else {
        finish(job, { status: "succeeded", mediaId: m.id });
        if (job.assetId && req.targetSlideId) placePhoto(job.assetId, req.targetSlideId, job.id, m.id, req.targetGallery);
      }
      return;
    }

    // Upscale: the new image replaces nothing; it is a sharper copy linked to its source.
    const source = job.mediaId ? getMedia(job.mediaId) : undefined;
    const tmp = await saveImage(buffer, {
      kind: "upscaled",
      isAi: source?.isAi ?? true,
      label: source?.label ?? job.request.label,
      prompt: source?.prompt ?? job.request.prompt,
      model: source?.model ?? job.model,
      params: { upscaledWith: UPSCALE_MODEL, ...(source?.params ?? {}) },
      sourceMediaId: source?.id ?? null,
    });
    const outMp = (tmp.width * tmp.height) / 1e6;
    const cost = imageCost(priceFor(UPSCALE_MODEL, prices), outMp);
    db.update(schema.media).set({ costUsd: cost + (source?.costUsd ?? 0) }).where(eq(schema.media.id, tmp.id)).run();
    recordCost({ provider: "replicate", model: UPSCALE_MODEL, operation: "upscale", quantity: { images: 1, megapixels: outMp }, costUsd: cost, assetId: job.assetId, mediaId: tmp.id, externalId: prediction.id });
    finish(job, { status: "succeeded", mediaId: tmp.id });
    if (job.assetId && job.request.targetSlideId) placePhoto(job.assetId, job.request.targetSlideId, job.id, tmp.id, job.request.targetGallery);
  } catch (err) {
    if (err instanceof MissingKeyError) throw err;
    finish(job, { status: "failed", error: err instanceof Error ? err.message : String(err) });
    if (job.assetId && job.request.targetSlideId) placePhoto(job.assetId, job.request.targetSlideId, job.id, null, job.request.targetGallery);
  } finally {
    busy.delete(job.id);
  }
}

export async function refreshJobs(ids: string[]): Promise<Job[]> {
  if (!ids.length) return [];
  const rows = db.select().from(schema.jobs).where(inArray(schema.jobs.id, ids)).all();
  await Promise.all(rows.map(advance));
  return db.select().from(schema.jobs).where(inArray(schema.jobs.id, ids)).all();
}

export function runningJobs(): Job[] {
  return db.select().from(schema.jobs).where(eq(schema.jobs.status, "running")).all();
}

export async function cancelJob(id: string) {
  const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get();
  if (!job || job.status !== "running") return;
  if (job.predictionId) await client().predictions.cancel(job.predictionId).catch(() => {});
  finish(job, { status: "canceled" });
}

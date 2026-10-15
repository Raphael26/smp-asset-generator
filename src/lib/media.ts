import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import type { Media } from "@/lib/db/schema";
import { CACHE_DIR, MEDIA_DIR } from "@/lib/paths";

export function mediaPath(m: Pick<Media, "fileName">): string {
  return path.join(MEDIA_DIR, m.fileName);
}

/** iPhone photos arrive as HEIC, which sharp cannot read: macOS converts them with sips. */
function toReadable(buffer: Buffer): Buffer {
  const head = buffer.subarray(4, 12).toString("latin1");
  if (!/ftyp(heic|heix|hevc|mif1|msf1)/.test(head)) return buffer;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smp-heic-"));
  try {
    const src = path.join(dir, "in.heic");
    const out = path.join(dir, "out.jpg");
    fs.writeFileSync(src, buffer);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", src, "--out", out], { stdio: "ignore" });
    return fs.readFileSync(out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function saveImage(
  input: Buffer,
  meta: {
    kind: "upload" | "generated" | "upscaled";
    isAi: boolean;
    label?: string;
    prompt?: string | null;
    model?: string | null;
    params?: Record<string, unknown> | null;
    sourceMediaId?: string | null;
    costUsd?: number;
  },
): Promise<Media> {
  const id = nanoid(12);
  // Photos are stored as high-quality JPEG, turned upright, in sRGB.
  const img = sharp(toReadable(input), { failOn: "none" }).rotate().toColorspace("srgb");
  const fileName = `${id}.jpg`;
  const info = await img.jpeg({ quality: 92, mozjpeg: true }).toFile(path.join(MEDIA_DIR, fileName));
  const row = {
    id,
    kind: meta.kind,
    fileName,
    mime: "image/jpeg",
    width: info.width,
    height: info.height,
    isAi: meta.isAi,
    label: meta.label ?? "",
    prompt: meta.prompt ?? null,
    model: meta.model ?? null,
    params: meta.params ?? null,
    sourceMediaId: meta.sourceMediaId ?? null,
    costUsd: meta.costUsd ?? 0,
  };
  db.insert(schema.media).values(row).run();
  return db.select().from(schema.media).where(eq(schema.media.id, id)).get()!;
}

export function getMedia(id: string): Media | undefined {
  return db.select().from(schema.media).where(eq(schema.media.id, id)).get();
}

/** A resized copy for previews, cached on disk. */
export async function previewFile(m: Media, width: number): Promise<string> {
  const w = Math.min(width, m.width);
  const file = path.join(CACHE_DIR, `${m.id}-w${w}.jpg`);
  if (!fs.existsSync(file)) {
    await sharp(mediaPath(m)).resize({ width: w }).jpeg({ quality: 82 }).toFile(file);
  }
  return file;
}

export function deleteMedia(id: string) {
  const m = getMedia(id);
  if (!m) return;
  db.delete(schema.media).where(eq(schema.media.id, id)).run();
  fs.rmSync(mediaPath(m), { force: true });
  for (const f of fs.readdirSync(CACHE_DIR)) if (f.startsWith(`${id}-`)) fs.rmSync(path.join(CACHE_DIR, f), { force: true });
}

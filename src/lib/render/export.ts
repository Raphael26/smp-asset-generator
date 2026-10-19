// Exports: Chrome (the one installed on the Mac, driven by Playwright) opens the /render page,
// which uses exactly the same component as the editor preview. Slides are captured at 2x
// and scaled down for crisp type, like the website's render.sh scripts did.
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright-core";
import sharp from "sharp";
import { zipSync } from "fflate";
import PptxGenJS from "pptxgenjs";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { EXPORTS_DIR } from "@/lib/paths";
import { addRevision, getAsset } from "@/lib/assets";
import { getFormat } from "@/lib/brand/formats";
import { plainText } from "@/lib/brand/typography";
import { UserFacingError } from "@/lib/errors";

const g = globalThis as unknown as { __smpBrowser?: Promise<Browser>; __smpBrowserTimer?: NodeJS.Timeout };

async function browser(): Promise<Browser> {
  clearTimeout(g.__smpBrowserTimer);
  g.__smpBrowserTimer = setTimeout(async () => {
    const b = await g.__smpBrowser?.catch(() => null);
    g.__smpBrowser = undefined;
    await b?.close().catch(() => {});
  }, 120_000);
  if (!g.__smpBrowser) {
    g.__smpBrowser = (async () => {
      try {
        return await chromium.launch({ channel: "chrome", headless: true });
      } catch {
        if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
        throw new UserFacingError("Google Chrome is needed to export. Install it, or set CHROME_PATH in .env to another Chromium browser.", 503);
      }
    })();
    g.__smpBrowser.catch(() => (g.__smpBrowser = undefined));
  }
  return g.__smpBrowser;
}

export function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "asset"
  );
}

export type ExportKind = "png" | "pdf" | "zip" | "pptx";

export async function exportAsset(assetId: string, origin: string, kind: ExportKind, onlySlide: number | null = null) {
  const asset = getAsset(assetId);
  const format = getFormat(asset.formatId);
  const total = asset.content.slides.length;
  if (!total) throw new UserFacingError("Add a slide first.");
  const id = nanoid(10);
  const dir = path.join(EXPORTS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const base = slug(asset.title);
  const files: string[] = [];

  const b = await browser();
  const context = await b.newContext({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    const ready = async () => {
      await page.waitForSelector('.smp-slide[data-ready="true"]', { timeout: 20_000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));
      });
    };

    // One slide as a PNG. Social images and presentation slides are posted at their native size; document pages
    // keep the 2x capture (sharper when shared).
    const capture = async (i: number): Promise<Buffer> => {
      await page.goto(`${origin}/render/${assetId}?slide=${i}`, { waitUntil: "networkidle" });
      await ready();
      const shot = await page.locator(".smp-slide").first().screenshot({ type: "png" });
      const scale = format.shape === "a4" ? 2 : 1;
      return sharp(shot).resize(format.width * scale, format.height * scale, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer();
    };

    if (kind === "png" || kind === "zip") {
      const indexes = onlySlide !== null ? [onlySlide] : [...Array(total).keys()];
      for (const i of indexes) {
        const name = total > 1 ? `${base}-${String(i + 1).padStart(2, "0")}.png` : `${base}.png`;
        fs.writeFileSync(path.join(dir, name), await capture(i));
        files.push(name);
      }
    }

    if (kind === "pptx") {
      // One picture per slide, so the deck looks exactly like the preview wherever it is opened (PowerPoint,
      // Keynote, Google Slides) whatever fonts are installed; the speaker notes travel with each slide.
      const pres = new PptxGenJS();
      pres.defineLayout({ name: "smp", width: format.width / 144, height: format.height / 144 });
      pres.layout = "smp";
      pres.title = asset.title;
      pres.author = "Spanish Mum in Paris";
      pres.company = "Spanish Mum in Paris";
      for (let i = 0; i < total; i++) {
        const s = asset.content.slides[i];
        const png = await capture(i);
        const out = pres.addSlide();
        const firstText = (s.blocks ?? []).flatMap((b) => (b.type === "text" ? [b.text] : []))[0] ?? "";
        out.addImage({ data: `image/png;base64,${png.toString("base64")}`, x: 0, y: 0, w: "100%", h: "100%", altText: plainText(s.fields.title ?? "") || plainText(firstText) || `Slide ${i + 1}` });
        if (s.notes?.trim()) out.addNotes(s.notes.trim());
      }
      const name = `${base}.pptx`;
      fs.writeFileSync(path.join(dir, name), (await pres.write({ outputType: "nodebuffer" })) as Buffer);
      files.push(name);
    }

    if (kind === "pdf" || (kind === "zip" && format.multi)) {
      await page.goto(`${origin}/render/${assetId}?mode=pdf`, { waitUntil: "networkidle" });
      await ready();
      const name = `${base}.pdf`;
      await page.pdf({ path: path.join(dir, name), width: `${format.width}px`, height: `${format.height}px`, printBackground: true, preferCSSPageSize: true });
      files.push(name);
    }
  } finally {
    await context.close();
  }

  let download = files;
  if (kind === "zip") {
    const name = `${base}.zip`;
    const entries: Record<string, Uint8Array> = {};
    for (const f of files) entries[f] = fs.readFileSync(path.join(dir, f));
    fs.writeFileSync(path.join(dir, name), zipSync(entries, { level: 0 }));
    download = [name, ...files];
  }

  db.insert(schema.exportsTable).values({ id, assetId, kind, files: download }).run();
  addRevision(assetId, `Exported (${kind.toUpperCase()})`);
  return { id, files: download.map((f) => ({ name: f, url: `/api/exports/${id}/${encodeURIComponent(f)}` })) };
}

export function listExports(assetId: string) {
  return db
    .select()
    .from(schema.exportsTable)
    .where(eq(schema.exportsTable.assetId, assetId))
    .orderBy(desc(schema.exportsTable.createdAt))
    .all()
    .map((e) => ({ ...e, links: e.files.map((f) => ({ name: f, url: `/api/exports/${e.id}/${encodeURIComponent(f)}` })) }));
}

export function exportFilePath(exportId: string, file: string): string {
  const row = db.select().from(schema.exportsTable).where(eq(schema.exportsTable.id, exportId)).get();
  if (!row || !row.files.includes(file)) throw new UserFacingError("File not found.", 404);
  return path.join(EXPORTS_DIR, exportId, file);
}

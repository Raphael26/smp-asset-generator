import path from "node:path";
import fs from "node:fs";

/** Everything the app writes lives in one folder: back it up by copying it.
 *  The comment keeps the dev server from watching it (each database write would reload the page). */
export const DATA_DIR = process.env.SMP_DATA_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data");
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const EXPORTS_DIR = path.join(DATA_DIR, "exports");
export const CACHE_DIR = path.join(DATA_DIR, "cache");
export const DB_FILE = path.join(DATA_DIR, "studio.db");

for (const dir of [DATA_DIR, MEDIA_DIR, EXPORTS_DIR, CACHE_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

import fs from "node:fs";
import { getMedia, mediaPath, previewFile } from "@/lib/media";
import { errorResponse, UserFacingError } from "@/lib/errors";

/** The image file; ?w=600 returns a cached smaller copy for previews. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const m = getMedia(id);
    if (!m) throw new UserFacingError("Image not found.", 404);
    const w = Number(new URL(req.url).searchParams.get("w"));
    const file = w > 0 ? await previewFile(m, Math.round(w)) : mediaPath(m);
    const download = new URL(req.url).searchParams.has("download");
    return new Response(fs.readFileSync(file), {
      headers: {
        "Content-Type": m.mime,
        "Cache-Control": "private, max-age=31536000, immutable",
        ...(download ? { "Content-Disposition": `attachment; filename="${(m.label || m.id).replace(/[^\w\- ]+/g, "")}.jpg"` } : {}),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

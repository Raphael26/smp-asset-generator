import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { deleteMedia, getMedia } from "@/lib/media";
import { errorResponse, UserFacingError } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!getMedia(id)) throw new UserFacingError("Image not found.", 404);
    const body = await req.json();
    const patch: { label?: string; favourite?: boolean; isAi?: boolean } = {};
    if (typeof body.label === "string") patch.label = body.label.slice(0, 120);
    if (typeof body.favourite === "boolean") patch.favourite = body.favourite;
    if (typeof body.isAi === "boolean") patch.isAi = body.isAi;
    db.update(schema.media).set(patch).where(eq(schema.media.id, id)).run();
    return Response.json({ media: getMedia(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    deleteMedia(id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

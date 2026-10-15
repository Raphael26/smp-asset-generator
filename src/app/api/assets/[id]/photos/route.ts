import { startSlidePhotos } from "@/lib/photos";
import { errorResponse, UserFacingError } from "@/lib/errors";

/** { items: [{ slideId, prompt }] } → starts one photo per slide; each lands in its slide when ready. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items.map((x: { slideId: unknown; prompt: unknown }) => ({ slideId: String(x.slideId), prompt: String(x.prompt ?? "") })) : [];
    if (!items.length) throw new UserFacingError("No photo to generate.");
    return Response.json({ jobs: await startSlidePhotos(id, items) });
  } catch (err) {
    return errorResponse(err);
  }
}

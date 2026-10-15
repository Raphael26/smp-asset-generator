import { addRevision, listRevisions, restoreRevision } from "@/lib/assets";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return Response.json({ revisions: listRevisions(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** { reason } saves the current state as a version; { restore: revisionId } goes back to one. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.restore) return Response.json({ asset: restoreRevision(id, String(body.restore)) });
    addRevision(id, String(body.reason || "Saved version"));
    return Response.json({ revisions: listRevisions(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

import { exportAsset, listExports, type ExportKind } from "@/lib/render/export";
import { errorResponse, UserFacingError } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return Response.json({ exports: listExports(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const kind = body.kind as ExportKind;
    if (!["png", "pdf", "zip", "pptx"].includes(kind)) throw new UserFacingError("Unknown export type.");
    const slide = typeof body.slide === "number" ? body.slide : null;
    // Chrome loads the render page from this same server.
    const origin = new URL(req.url).origin;
    return Response.json(await exportAsset(id, origin, kind, slide));
  } catch (err) {
    return errorResponse(err);
  }
}

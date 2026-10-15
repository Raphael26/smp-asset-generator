import { deleteAsset, getAsset, updateAsset } from "@/lib/assets";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return Response.json({ asset: getAsset(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const asset = updateAsset(id, await req.json());
    return Response.json({ asset });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    deleteAsset(id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

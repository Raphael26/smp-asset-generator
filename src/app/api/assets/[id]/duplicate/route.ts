import { duplicateAsset } from "@/lib/assets";
import { errorResponse } from "@/lib/errors";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return Response.json({ asset: duplicateAsset(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

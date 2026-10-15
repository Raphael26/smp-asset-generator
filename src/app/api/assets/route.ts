import { createAsset, listAssets } from "@/lib/assets";
import { errorResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const assets = listAssets({
      q: p.get("q") ?? undefined,
      formatId: p.get("format") ?? undefined,
      universe: p.get("universe") ?? undefined,
      status: p.get("status") ?? undefined,
    });
    return Response.json({ assets });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const asset = createAsset({
      title: String(body.title ?? ""),
      formatId: String(body.formatId ?? ""),
      universe: body.universe ? String(body.universe) : null,
      starterId: String(body.starterId ?? ""),
    });
    return Response.json({ asset });
  } catch (err) {
    return errorResponse(err);
  }
}

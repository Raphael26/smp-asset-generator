import { getSettings, keysStatus, updateSettings, type Settings } from "@/lib/settings";
import { monthStart, spentSince } from "@/lib/costs";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    return Response.json({ settings: getSettings(), keys: keysStatus(), monthUsd: spentSince(monthStart()) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<Settings>;
    const patch: Partial<Settings> = {};
    if (typeof body.monthlyBudgetUsd === "number" && body.monthlyBudgetUsd >= 0) patch.monthlyBudgetUsd = body.monthlyBudgetUsd;
    if (typeof body.defaultImageModel === "string") patch.defaultImageModel = body.defaultImageModel;
    if (typeof body.defaultUpscale === "boolean") patch.defaultUpscale = body.defaultUpscale;
    if (typeof body.autoPhotos === "boolean") patch.autoPhotos = body.autoPhotos;
    if (body.prices && typeof body.prices === "object") patch.prices = body.prices;
    return Response.json({ settings: updateSettings(patch) });
  } catch (err) {
    return errorResponse(err);
  }
}

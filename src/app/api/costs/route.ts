import { costSummary } from "@/lib/costs";
import { getSettings } from "@/lib/settings";
import { DEFAULT_PRICES } from "@/lib/ai/pricing";
import { listAssets } from "@/lib/assets";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const settings = getSettings();
    const titles = Object.fromEntries(listAssets().map((a) => [a.id, a.title]));
    return Response.json({
      ...costSummary(),
      budgetUsd: settings.monthlyBudgetUsd,
      prices: { ...DEFAULT_PRICES, ...settings.prices },
      customised: Object.keys(settings.prices),
      assetTitles: titles,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

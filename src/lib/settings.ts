import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PriceRule } from "@/lib/ai/pricing";

export type Settings = {
  monthlyBudgetUsd: number;
  defaultImageModel: string;
  defaultUpscale: boolean;
  /** Prices Rebeca corrected; anything missing falls back to DEFAULT_PRICES. */
  prices: Record<string, PriceRule>;
};

export const DEFAULT_SETTINGS: Settings = {
  monthlyBudgetUsd: 30,
  defaultImageModel: "black-forest-labs/flux-2-max",
  defaultUpscale: false,
  prices: {},
};

export function getSettings(): Settings {
  const rows = db.select().from(schema.settings).all();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as Settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS) || value === undefined) continue;
    const existing = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
    if (existing) db.update(schema.settings).set({ value }).where(eq(schema.settings.key, key)).run();
    else db.insert(schema.settings).values({ key, value }).run();
  }
  return getSettings();
}

export function keysStatus() {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    replicate: Boolean(process.env.REPLICATE_API_TOKEN),
  };
}

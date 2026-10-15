import { desc, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";

export type Operation = "compose" | "edit" | "image" | "upscale" | "improve" | "caption" | "prompt" | "review";

export const OPERATION_LABELS: Record<Operation, string> = {
  compose: "Visual from a prompt",
  edit: "Change from a prompt",
  image: "Image generation",
  upscale: "Upscaling",
  improve: "Text improvement",
  caption: "Caption",
  prompt: "Image prompt",
  review: "Brand review",
};

export function recordCost(e: {
  provider: "replicate" | "anthropic";
  model: string;
  operation: Operation;
  quantity: Record<string, number>;
  costUsd: number;
  assetId?: string | null;
  mediaId?: string | null;
  externalId?: string | null;
}) {
  db.insert(schema.costEvents)
    .values({
      id: nanoid(12),
      provider: e.provider,
      model: e.model,
      operation: e.operation,
      quantity: e.quantity,
      costUsd: Math.round(e.costUsd * 1e6) / 1e6,
      assetId: e.assetId ?? null,
      mediaId: e.mediaId ?? null,
      externalId: e.externalId ?? null,
    })
    .run();
}

export function monthStart(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export function spentSince(iso: string): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${schema.costEvents.costUsd}), 0)` })
    .from(schema.costEvents)
    .where(gte(schema.costEvents.createdAt, iso))
    .get();
  return row?.total ?? 0;
}

export function costSummary() {
  const all = db.select().from(schema.costEvents).orderBy(desc(schema.costEvents.createdAt)).all();
  const start = monthStart();
  const thisMonth = all.filter((e) => e.createdAt >= start);
  const sum = (xs: typeof all) => xs.reduce((s, e) => s + e.costUsd, 0);

  const group = (xs: typeof all, key: (e: (typeof all)[number]) => string) => {
    const m = new Map<string, { key: string; count: number; costUsd: number }>();
    for (const e of xs) {
      const k = key(e);
      const g = m.get(k) ?? { key: k, count: 0, costUsd: 0 };
      g.count++;
      g.costUsd += e.costUsd;
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.costUsd - a.costUsd);
  };

  // Last six months, oldest first, including empty months.
  const months: { month: string; costUsd: number; replicate: number; anthropic: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const xs = all.filter((e) => e.createdAt >= d.toISOString() && e.createdAt < next);
    months.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      costUsd: sum(xs),
      replicate: sum(xs.filter((e) => e.provider === "replicate")),
      anthropic: sum(xs.filter((e) => e.provider === "anthropic")),
    });
  }

  return {
    totalUsd: sum(all),
    monthUsd: sum(thisMonth),
    monthCount: thisMonth.length,
    byProvider: group(thisMonth, (e) => e.provider),
    byOperation: group(thisMonth, (e) => e.operation),
    byModel: group(thisMonth, (e) => e.model),
    byAsset: group(
      all.filter((e) => e.assetId),
      (e) => e.assetId!,
    ).slice(0, 10),
    months,
    recent: all.slice(0, 200),
  };
}

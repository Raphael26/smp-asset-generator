import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import type { AssetContent } from "@/lib/content";

const now = () => new Date().toISOString();

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    formatId: text("format_id").notNull(),
    universe: text("universe"), // decoration | organisation | entreprises | null
    status: text("status").notNull().default("draft"), // draft | ready | published
    content: text("content", { mode: "json" }).$type<AssetContent>().notNull(),
    notes: text("notes").notNull().default(""),
    /** What Rebeca asked for when the asset was created from a prompt. */
    prompt: text("prompt"),
    promptOptions: text("prompt_options", { mode: "json" }).$type<CreateOptions>(),
    publishedAt: text("published_at"),
    publishedUrl: text("published_url"),
    createdAt: text("created_at").notNull().$defaultFn(now),
    updatedAt: text("updated_at").notNull().$defaultFn(now),
  },
  (t) => [index("assets_updated_idx").on(t.updatedAt)],
);

export const assetRevisions = sqliteTable(
  "asset_revisions",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content", { mode: "json" }).$type<AssetContent>().notNull(),
    reason: text("reason").notNull(), // "Before Claude edit", "Export", "Saved version", …
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("revisions_asset_idx").on(t.assetId)],
);

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(), // upload | generated | upscaled
    fileName: text("file_name").notNull(), // relative to data/media
    mime: text("mime").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    isAi: integer("is_ai", { mode: "boolean" }).notNull().default(false),
    label: text("label").notNull().default(""),
    prompt: text("prompt"),
    model: text("model"),
    params: text("params", { mode: "json" }).$type<Record<string, unknown>>(),
    sourceMediaId: text("source_media_id"),
    costUsd: real("cost_usd").notNull().default(0),
    favourite: integer("favourite", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("media_created_idx").on(t.createdAt)],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(), // running | succeeded | failed | canceled
    stage: text("stage").notNull(), // generate | upscale
    model: text("model").notNull(),
    predictionId: text("prediction_id"),
    input: text("input", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    request: text("request", { mode: "json" }).$type<ImageJobRequest>().notNull(),
    mediaId: text("media_id"), // set once an image is saved (upscaled one if upscaling)
    error: text("error"),
    assetId: text("asset_id"),
    createdAt: text("created_at").notNull().$defaultFn(now),
    completedAt: text("completed_at"),
  },
  (t) => [index("jobs_status_idx").on(t.status)],
);

export type CreateOptions = {
  formatId: string; // or "auto"
  universe: string; // decoration | organisation | entreprises | none | auto
  images: "auto" | "none" | "library" | "ai";
  slides: number | null; // carousels only; null = let Claude decide
};

export type ImageJobRequest = {
  prompt: string;
  idea?: string; // what Rebeca typed before Claude rewrote it, if she used that
  model: string;
  width: number;
  height: number;
  upscale: boolean;
  label: string;
  /** When set, the finished photo is placed in this slide of job.assetId. */
  targetSlideId?: string;
};

export const costEvents = sqliteTable(
  "cost_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(), // replicate | anthropic
    model: text("model").notNull(),
    operation: text("operation").notNull(), // image | upscale | improve | caption | prompt | review
    quantity: text("quantity", { mode: "json" }).$type<Record<string, number>>().notNull(),
    costUsd: real("cost_usd").notNull(),
    assetId: text("asset_id"),
    mediaId: text("media_id"),
    externalId: text("external_id"), // Replicate prediction id or Anthropic message id
    createdAt: text("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("costs_created_idx").on(t.createdAt)],
);

export const exportsTable = sqliteTable("exports", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // png | pdf | zip
  files: text("files", { mode: "json" }).$type<string[]>().notNull(), // relative to data/exports/<id>
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type CostEvent = typeof costEvents.$inferSelect;
export type Revision = typeof assetRevisions.$inferSelect;
export type ExportRow = typeof exportsTable.$inferSelect;

"use client";

import { useRef, useState } from "react";
import type { Media } from "@/lib/db/schema";
import { api } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";

export type MediaFilter = "all" | "real" | "ai" | "favourites";

export function filterMedia(media: Media[], filter: MediaFilter, q: string) {
  const query = q.trim().toLowerCase();
  // Real photos of Rebeca come first (guidelines 05), then AI images; newest first in each group.
  const sorted = [...media].sort((a, b) => Number(a.isAi) - Number(b.isAi) || b.createdAt.localeCompare(a.createdAt));
  return sorted.filter((m) => {
    if (filter === "real" && m.isAi) return false;
    if (filter === "ai" && !m.isAi) return false;
    if (filter === "favourites" && !m.favourite) return false;
    if (query && !`${m.label} ${m.prompt ?? ""}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function MediaToolbar({
  filter,
  setFilter,
  q,
  setQ,
  onUploaded,
}: {
  filter: MediaFilter;
  setFilter: (f: MediaFilter) => void;
  q: string;
  setQ: (q: string) => void;
  onUploaded: (m: Media[]) => void;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      const { media } = await api<{ media: Media[] }>("/api/media", { method: "POST", body: form });
      onUploaded(media);
      toast(`${media.length} photo${media.length > 1 ? "s" : ""} added.`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1.5">
        {(
          [
            ["all", "All"],
            ["real", "Real photos"],
            ["ai", "AI images"],
            ["favourites", "Favourites"],
          ] as [MediaFilter, string][]
        ).map(([id, label]) => (
          <button key={id} className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <label className="relative ml-auto">
        <Icon name="search" size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-taupe" />
        <input className="field h-9 w-[200px] py-1 pl-8 text-[13px]" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => upload(e.target.files)} />
      <button className="btn btn-outline btn-sm h-9" disabled={uploading} onClick={() => input.current?.click()}>
        <Icon name="upload" size={14} /> {uploading ? "Uploading…" : "Upload photos"}
      </button>
    </div>
  );
}

export function MediaGrid({
  media,
  onSelect,
  selectedId,
  size = 150,
  empty = "No images yet.",
}: {
  media: Media[];
  onSelect: (m: Media) => void;
  selectedId?: string | null;
  size?: number;
  empty?: string;
}) {
  if (!media.length) return <p className="py-10 text-center text-[13px] text-muted">{empty}</p>;
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))` }}>
      {media.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m)}
          className={`group relative block aspect-square overflow-hidden border bg-stone text-left ${selectedId === m.id ? "border-ink outline-2 outline-offset-2 outline-ink" : "border-line"}`}
          title={m.label || m.prompt || ""}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${m.id}/file?w=360`} alt={m.label} loading="lazy" className="h-full w-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.03]" />
          <span className="absolute top-1.5 left-1.5 flex gap-1">
            {m.isAi && <span className="tag bg-paper/90 text-taupe">AI</span>}
            {m.kind === "upscaled" && <span className="tag bg-paper/90 text-taupe">HD</span>}
          </span>
          {m.favourite && <Icon name="star" size={14} className="absolute top-2 right-2 fill-paper text-ink" />}
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/60 to-transparent px-2 pt-5 pb-1.5 text-[11.5px] text-cream opacity-0 transition-opacity group-hover:opacity-100">
            {m.label || "Untitled"} · {m.width}×{m.height}
          </span>
        </button>
      ))}
    </div>
  );
}

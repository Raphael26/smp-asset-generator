"use client";

import { useState } from "react";
import type { Media } from "@/lib/db/schema";
import { Modal } from "@/components/ui/Modal";
import { MediaGrid, MediaToolbar, filterMedia, type MediaFilter } from "./MediaGrid";
import { GeneratePanel } from "./GeneratePanel";

export function ImagePicker({
  open,
  onClose,
  media,
  setMedia,
  frame,
  assetId,
  currentId,
  initialPrompt,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  media: Media[];
  setMedia: (fn: (m: Media[]) => Media[]) => void;
  frame: { width: number; height: number } | null;
  assetId: string;
  currentId: string | null;
  initialPrompt?: string | null;
  onPick: (mediaId: string) => void;
}) {
  const [tab, setTab] = useState<"library" | "generate">("library");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [q, setQ] = useState("");

  const pick = (id: string) => {
    onPick(id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Photo" title={<>Choose a photo, <em>or make one.</em></>} width={1040}>
      <div className="mb-6 flex gap-6 border-b border-line">
        {(
          [
            ["library", "From the library"],
            ["generate", "Generate with AI"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 pb-3 text-[13.5px] ${tab === id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "library" ? (
        <div className="flex flex-col gap-5">
          <MediaToolbar filter={filter} setFilter={setFilter} q={q} setQ={setQ} onUploaded={(m) => setMedia((prev) => [...m, ...prev])} />
          <p className="text-[12px] text-muted">Real photos of Rebeca are the brand’s strongest images: use them first. AI images carry an « AI » tag.</p>
          <MediaGrid media={filterMedia(media, filter, q)} onSelect={(m) => pick(m.id)} selectedId={currentId} />
        </div>
      ) : (
        <GeneratePanel frame={frame} assetId={assetId} initialPrompt={initialPrompt} onReady={(m) => setMedia((prev) => [m, ...prev.filter((x) => x.id !== m.id)])} onSelect={pick} />
      )}
    </Modal>
  );
}

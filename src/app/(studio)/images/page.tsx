"use client";

import { useEffect, useState } from "react";
import type { Job, Media } from "@/lib/db/schema";
import { api, shortDate, usd } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { MediaGrid, MediaToolbar, filterMedia, type MediaFilter } from "@/components/images/MediaGrid";
import { GeneratePanel } from "@/components/images/GeneratePanel";
import { useJobs } from "@/components/images/useJobs";

export default function ImagesPage() {
  const toast = useToast();
  const [media, setMedia] = useState<Media[] | null>(null);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Media | null>(null);
  const [generate, setGenerate] = useState(false);
  const [label, setLabel] = useState("");

  const load = () => api<{ media: Media[] }>("/api/media").then((d) => setMedia(d.media));
  useEffect(() => {
    load();
  }, []);

  const upscaler = useJobs(
    (job: Job) => {
      toast("Sharper copy ready.", "success");
      load().then(() => {
        if (job.mediaId) api<{ media: Media[] }>("/api/media").then((d) => setOpen(d.media.find((m) => m.id === job.mediaId) ?? null));
      });
    },
    (msg) => toast(msg, "error"),
  );

  const patch = async (m: Media, body: Partial<Pick<Media, "label" | "favourite" | "isAi">>) => {
    const { media: updated } = await api<{ media: Media }>(`/api/media/${m.id}`, { method: "PATCH", json: body });
    setMedia((list) => list?.map((x) => (x.id === m.id ? updated : x)) ?? null);
    setOpen(updated);
  };

  const [toDelete, setToDelete] = useState<Media | null>(null);
  const remove = async (m: Media) => {
    await api(`/api/media/${m.id}`, { method: "DELETE" });
    setMedia((list) => list?.filter((x) => x.id !== m.id) ?? null);
    setOpen(null);
  };

  const upscale = async (m: Media) => {
    try {
      const { jobs } = await api<{ jobs: Job[] }>("/api/images", { method: "POST", json: { action: "upscale", mediaId: m.id } });
      upscaler.add(jobs);
      toast("Sharpening with Topaz… about 10 seconds.");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const list = media ? filterMedia(media, filter, q) : [];
  const counts = media ? { real: media.filter((m) => !m.isAi).length, ai: media.filter((m) => m.isAi).length } : null;

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-12">
      <header className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Images</p>
          <h1 className="display text-[56px]">
            Real photos first, <em>then the rest.</em>
          </h1>
          {counts && (
            <p className="mt-3 text-ink-soft">
              {counts.real} real photo{counts.real === 1 ? "" : "s"} · {counts.ai} AI image{counts.ai === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <button className="btn btn-solid" onClick={() => setGenerate(true)}>
          <Icon name="wand" size={15} /> Generate a photo
        </button>
      </header>
      <div className="mb-6 border-y border-line py-4">
        <MediaToolbar filter={filter} setFilter={setFilter} q={q} setQ={setQ} onUploaded={(m) => setMedia((prev) => [...m, ...(prev ?? [])])} />
      </div>
      {media === null ? (
        <p className="text-taupe">Loading…</p>
      ) : (
        <MediaGrid
          media={list}
          size={190}
          onSelect={(m) => {
            setOpen(m);
            setLabel(m.label);
          }}
          empty={media.length ? "Nothing matches." : "Upload Rebeca’s photos, or generate an image."}
        />
      )}

      <Modal open={generate} onClose={() => setGenerate(false)} eyebrow="Generate" title={<>A photo <em>in the brand’s light.</em></>} width={1040}>
        <GeneratePanel frame={null} onReady={(m) => setMedia((prev) => [m, ...(prev ?? []).filter((x) => x.id !== m.id)])} />
      </Modal>

      <Modal open={open !== null} onClose={() => setOpen(null)} eyebrow={open?.isAi ? "AI image" : "Real photo"} title={open?.label || "Untitled"} width={980}>
        {open && (
          <div className="grid grid-cols-[1fr_320px] gap-8">
            <div className="flex items-center justify-center bg-stone">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${open.id}/file?w=1400`} alt={open.label} className="max-h-[64vh] w-auto" />
            </div>
            <div className="flex flex-col gap-5 text-[13px]">
              <div>
                <label className="label" htmlFor="m-label">
                  Name
                </label>
                <div className="flex gap-2">
                  <input id="m-label" className="field" value={label} onChange={(e) => setLabel(e.target.value)} />
                  <button className="btn btn-outline btn-sm h-[38px]" disabled={label === open.label} onClick={() => patch(open, { label })}>
                    Save
                  </button>
                </div>
              </div>
              <dl className="grid grid-cols-[96px_1fr] gap-y-1.5 text-ink-soft">
                <dt className="text-muted">Size</dt>
                <dd>
                  {open.width} × {open.height}
                </dd>
                <dt className="text-muted">Added</dt>
                <dd>{shortDate(open.createdAt)}</dd>
                {open.model && (
                  <>
                    <dt className="text-muted">Model</dt>
                    <dd>{open.model.split("/").pop()}</dd>
                  </>
                )}
                {open.costUsd > 0 && (
                  <>
                    <dt className="text-muted">Cost</dt>
                    <dd>{usd(open.costUsd)}</dd>
                  </>
                )}
              </dl>
              {open.prompt && (
                <div>
                  <p className="label">Prompt</p>
                  <p className="max-h-[160px] overflow-y-auto bg-cream p-3 text-[12.5px] leading-relaxed text-ink-soft">{open.prompt}</p>
                </div>
              )}
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2.5">
                  <input type="checkbox" className="accent-ink" checked={open.favourite} onChange={(e) => patch(open, { favourite: e.target.checked })} />
                  Favourite
                </label>
                <label className="flex items-center gap-2.5">
                  <input type="checkbox" className="accent-ink" checked={open.isAi} onChange={(e) => patch(open, { isAi: e.target.checked })} />
                  Made by AI (never presented as a real home)
                </label>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
                {open.width * open.height <= 6e6 && (
                  <button className="btn btn-outline btn-sm" disabled={upscaler.busy} onClick={() => upscale(open)}>
                    {upscaler.busy ? "Sharpening…" : "Sharpen ×2 · $0.05"}
                  </button>
                )}
                <a className="btn btn-ghost btn-sm" href={`/api/media/${open.id}/file?download`}>
                  <Icon name="download" size={14} /> Download
                </a>
                <button className="btn btn-ghost btn-sm text-flag" onClick={() => setToDelete(open)}>
                  <Icon name="trash" size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove(toDelete)}
        title={<>Delete this image?</>}
        message="Slides that use it will show an empty frame."
      />
    </div>
  );
}

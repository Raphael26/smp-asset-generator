"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/lib/db/schema";
import { getFormat } from "@/lib/brand/formats";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { api, relativeTime } from "@/components/ui/api";
import { useToast } from "@/components/ui/Toaster";

type FileLink = { name: string; url: string };
type ExportRow = { id: string; kind: string; createdAt: string; links: FileLink[] };

export function ExportDialog({
  open,
  onClose,
  asset,
  current,
  flush,
  errors,
  onMarkPublished,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  current: number;
  flush: () => Promise<void>;
  errors: number;
  onMarkPublished: () => void;
}) {
  const toast = useToast();
  const format = getFormat(asset.formatId);
  const total = asset.content.slides.length;
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<FileLink[] | null>(null);
  const [history, setHistory] = useState<ExportRow[]>([]);

  useEffect(() => {
    if (!open) return;
    api<{ exports: ExportRow[] }>(`/api/assets/${asset.id}/export`).then((d) => setHistory(d.exports));
  }, [open, asset.id]);

  const run = async (kind: "png" | "pdf" | "zip", slide: number | null, label: string) => {
    setBusy(label);
    try {
      await flush();
      const out = await api<{ files: FileLink[] }>(`/api/assets/${asset.id}/export`, { method: "POST", json: { kind, slide } });
      setResult(out.files);
      // Download the main file straight away.
      const a = document.createElement("a");
      a.href = out.files[0].url;
      a.download = out.files[0].name;
      a.click();
      api<{ exports: ExportRow[] }>(`/api/assets/${asset.id}/export`).then((d) => setHistory(d.exports));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const options: { kind: "png" | "pdf" | "zip"; slide: number | null; label: string; detail: string; primary?: boolean }[] = [];
  if (format.id === "linkedin-carousel") {
    options.push({ kind: "pdf", slide: null, label: "PDF for LinkedIn", detail: `One page per slide, ${total} pages. Upload it as a document.`, primary: true });
    options.push({ kind: "zip", slide: null, label: "All slides as images", detail: "A ZIP with the PNGs and the PDF." });
  } else if (format.multi) {
    options.push({ kind: "zip", slide: null, label: `All ${total} slides`, detail: "A ZIP of PNG images, in order.", primary: true });
    options.push({ kind: "pdf", slide: null, label: "PDF", detail: "Handy to share for review." });
  } else {
    options.push({ kind: "png", slide: null, label: "PNG image", detail: `${format.width} × ${format.height}, ready to post.`, primary: true });
  }
  if (format.multi) options.push({ kind: "png", slide: current, label: `Slide ${current + 1} only`, detail: "One PNG." });

  return (
    <Modal open={open} onClose={onClose} eyebrow="Export" title={<>Ready <em>to share.</em></>} width={720}>
      <div className="flex flex-col gap-6">
        {errors > 0 && (
          <p className="flex items-start gap-2 border border-blush bg-blush px-4 py-3 text-[13px] text-flag">
            <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
            The brand check found {errors} problem{errors > 1 ? "s" : ""} to fix. You can still export.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <button
              key={o.label}
              disabled={busy !== null}
              onClick={() => run(o.kind, o.slide, o.label)}
              className={`flex items-center justify-between gap-4 border px-5 py-4 text-left transition-colors disabled:opacity-60 ${o.primary ? "border-ink bg-paper hover:bg-cream" : "border-line hover:border-rule"}`}
            >
              <span>
                <span className="block font-display text-[19px] font-light">{o.label}</span>
                <span className="block text-[12.5px] text-muted">{o.detail}</span>
              </span>
              <span className="flex items-center gap-2 text-[11px] tracking-[.13em] text-taupe uppercase">
                {busy === o.label ? <span className="anim-pulse">Rendering…</span> : <Icon name="download" size={18} />}
              </span>
            </button>
          ))}
        </div>

        {result && (
          <div className="anim-rise border-l-2 border-taupe-logo bg-cream px-4 py-3">
            <p className="eyebrow mb-2">Downloaded</p>
            <ul className="flex flex-col gap-1 text-[13px]">
              {result.map((f) => (
                <li key={f.name}>
                  <a href={f.url} className="underline decoration-rule underline-offset-4 hover:decoration-ink">
                    {f.name}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {asset.content.caption.trim() && (
                <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(asset.content.caption).then(() => toast("Caption copied.", "success"))}>
                  <Icon name="copy" size={14} /> Copy the caption
                </button>
              )}
              {asset.status !== "published" && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    onMarkPublished();
                    onClose();
                  }}
                >
                  <Icon name="check" size={14} /> Mark as published
                </button>
              )}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="label">Earlier exports</p>
            <ul className="divide-y divide-line border-y border-line">
              {history.slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
                  <span className="text-ink-soft">
                    {relativeTime(h.createdAt)} · {h.kind.toUpperCase()}
                  </span>
                  <span className="flex gap-3">
                    {h.links.slice(0, 3).map((l) => (
                      <a key={l.name} href={l.url} className="text-taupe underline decoration-rule underline-offset-4 hover:text-ink">
                        {l.name.split(".").pop()?.toUpperCase()}
                        {l.name.match(/-(\d\d)\.png$/) ? ` ${l.name.match(/-(\d\d)\.png$/)![1]}` : ""}
                      </a>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

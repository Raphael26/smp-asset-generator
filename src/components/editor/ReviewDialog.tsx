"use client";

import { useState } from "react";
import type { Asset } from "@/lib/db/schema";
import { getLayout } from "@/lib/brand/layouts";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/components/ui/api";

type Review = {
  summary: string;
  comments: { slide: number | null; field: string | null; severity: "important" | "suggestion"; comment: string; suggestion: string | null }[];
};

export function ReviewDialog({
  open,
  onClose,
  asset,
  flush,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  flush: () => Promise<void>;
  onUse: (slide: number | null, field: string, value: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState<Set<number>>(new Set());

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await flush();
      setReview(await api<Review>(`/api/assets/${asset.id}/ai`, { method: "POST", json: { action: "review" } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fieldLabel = (slide: number | null, field: string | null) => {
    if (slide === null || !field) return field === "caption" || slide === null ? "Caption / whole post" : field;
    const s = asset.content.slides[slide - 1];
    const f = s ? getLayout(s.layout).fields.find((x) => x.key === field) : null;
    return `${asset.content.slides.length > 1 ? `Slide ${slide} · ` : ""}${f?.label ?? field}`;
  };

  const canUse = (c: Review["comments"][number]) => {
    if (!c.suggestion || !c.field) return false;
    if (c.field === "caption") return true;
    const s = c.slide !== null ? asset.content.slides[c.slide - 1] : null;
    return Boolean(s && getLayout(s.layout).fields.some((f) => f.key === c.field));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Claude"
      title={<>A second pair <em>of eyes.</em></>}
      width={780}
      footer={
        !review ? (
          <button className="btn btn-solid" disabled={busy} onClick={run}>
            <Icon name="eye" size={15} /> {busy ? "Claude is reviewing…" : "Review against the brand"}
          </button>
        ) : (
          <button className="btn btn-outline" onClick={onClose}>
            Done
          </button>
        )
      }
    >
      {!review ? (
        <div className="flex flex-col gap-4">
          <p className="max-w-[600px] text-ink-soft">
            Claude reads the whole post as a brand editor would: Rebeca’s voice, titles, figures and their sources, names, and whether each text fits its template. The automatic brand check already covers punctuation and forbidden words.
          </p>
          {busy && <p className="anim-pulse text-[13px] text-taupe">Reading… 10 to 30 seconds.</p>}
          {error && <p className="border border-blush bg-blush px-4 py-3 text-[13px] text-flag">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="font-display text-[19px] leading-snug font-light">{review.summary}</p>
          {review.comments.length === 0 && <p className="text-ink-soft">No comments: it is ready.</p>}
          {review.comments.map((c, i) => (
            <div key={i} className="border border-line p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`tag ${c.severity === "important" ? "bg-blush text-flag" : "bg-stone text-taupe"}`}>{c.severity === "important" ? "Important" : "Suggestion"}</span>
                <span className="text-[12px] text-muted">{fieldLabel(c.slide, c.field)}</span>
              </div>
              <p className="text-[13.5px] text-ink">{c.comment}</p>
              {c.suggestion && (
                <div className="mt-3 flex items-start justify-between gap-4 bg-cream px-3 py-2.5">
                  <p className="text-[13.5px] whitespace-pre-wrap text-ink-soft italic">{c.suggestion}</p>
                  {canUse(c) && (
                    <button
                      className="btn btn-outline btn-sm shrink-0"
                      disabled={used.has(i)}
                      onClick={() => {
                        onUse(c.field === "caption" ? null : c.slide! - 1, c.field!, c.suggestion!);
                        setUsed((s) => new Set(s).add(i));
                      }}
                    >
                      {used.has(i) ? "Used" : "Use this"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

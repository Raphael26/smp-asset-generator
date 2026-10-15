"use client";

import { useState } from "react";
import type { Asset } from "@/lib/db/schema";
import type { AssetContent } from "@/lib/content";
import { getLayout } from "@/lib/brand/layouts";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/components/ui/api";

type Proposal = { slides: { index: number; fields: Record<string, string> }[]; caption: string | null; notes: string[] };
type Change = { id: string; slide: number | null; field: string; label: string; before: string; after: string };

/**
 * Rebeca's text, improved by Claude, shown field by field. Nothing changes until she
 * applies the changes she ticked; the previous text is kept as a version.
 */
export function ImproveDialog({
  open,
  onClose,
  asset,
  current,
  flush,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  current: number;
  flush: () => Promise<void>;
  onApply: (content: AssetContent) => Promise<void>;
}) {
  const multi = asset.content.slides.length > 1;
  const [scope, setScope] = useState<"all" | "slide">(multi ? "all" : "slide");
  const [instruction, setInstruction] = useState("");
  const [includeCaption, setIncludeCaption] = useState(Boolean(asset.content.caption.trim()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await flush();
      const p = await api<Proposal>(`/api/assets/${asset.id}/ai`, {
        method: "POST",
        json: { action: "improve", slide: scope === "slide" ? current : null, instruction, includeCaption },
      });
      const list: Change[] = [];
      for (const s of p.slides) {
        const slide = asset.content.slides[s.index];
        if (!slide) continue;
        const def = getLayout(slide.layout);
        for (const f of def.fields) {
          const after = s.fields[f.key];
          const before = slide.fields[f.key] ?? "";
          if (after === undefined || after.trim() === before.trim()) continue;
          list.push({ id: `${s.index}:${f.key}`, slide: s.index, field: f.key, label: f.label, before, after });
        }
      }
      if (p.caption !== null && p.caption.trim() !== asset.content.caption.trim())
        list.push({ id: "caption", slide: null, field: "caption", label: "Caption", before: asset.content.caption, after: p.caption });
      setChanges(list);
      setNotes(p.notes);
      setPicked(new Set(list.map((c) => c.id)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!changes) return;
    await api(`/api/assets/${asset.id}/revisions`, { method: "POST", json: { reason: "Before Claude’s edit" } });
    const content: AssetContent = structuredClone(asset.content);
    for (const c of changes) {
      if (!picked.has(c.id)) continue;
      if (c.slide === null) content.caption = c.after;
      else content.slides[c.slide].fields[c.field] = c.after;
    }
    await onApply(content);
    onClose();
  };

  const footer = changes ? (
    <>
      <button className="btn btn-ghost" onClick={() => setChanges(null)}>
        Ask again
      </button>
      <button className="btn btn-solid" disabled={!picked.size} onClick={apply}>
        Apply {picked.size} change{picked.size === 1 ? "" : "s"}
      </button>
    </>
  ) : (
    <>
      <button className="btn btn-ghost" onClick={onClose}>
        Cancel
      </button>
      <button className="btn btn-solid" disabled={busy} onClick={run}>
        <Icon name="wand" size={15} /> {busy ? "Claude is reading…" : "Improve my text"}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} eyebrow="Claude" title={<>Make it read <em>even better.</em></>} footer={footer} width={860}>
      {!changes ? (
        <div className="flex flex-col gap-6">
          <p className="max-w-[620px] text-ink-soft">
            Claude keeps your meaning and your words where it can: it tightens the rhythm, fixes spelling, fits each text to its space in the template and follows the brand voice. It never invents figures or sources. You choose which changes to keep.
          </p>
          {multi && (
            <div>
              <p className="label">What to improve</p>
              <div className="flex gap-1.5">
                <button className="chip" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
                  All {asset.content.slides.length} slides
                </button>
                <button className="chip" aria-pressed={scope === "slide"} onClick={() => setScope("slide")}>
                  Slide {current + 1} only
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="label" htmlFor="instruction">
              Anything in particular? <span className="font-normal tracking-normal normal-case text-muted">optional</span>
            </label>
            <input
              id="instruction"
              className="field"
              placeholder="Plus court · plus chaleureux · un ton plus professionnel pour les RH · garde le titre…"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>
          {asset.content.caption.trim() && (
            <label className="flex items-center gap-2.5 text-[13px]">
              <input type="checkbox" className="accent-ink" checked={includeCaption} onChange={(e) => setIncludeCaption(e.target.checked)} />
              Improve the caption too
            </label>
          )}
          {busy && <p className="anim-pulse text-[13px] text-taupe">Claude is reading your text. This takes 10 to 30 seconds.</p>}
          {error && <p className="border border-blush bg-blush px-4 py-3 text-[13px] text-flag">{error}</p>}
        </div>
      ) : changes.length === 0 ? (
        <div className="py-6">
          <h3 className="display text-[26px]">Nothing to change.</h3>
          <p className="mt-2 text-ink-soft">Claude found your text already right for this template.</p>
          {notes.length > 0 && (
            <ul className="mt-4 list-disc pl-5 text-[13px] text-ink-soft">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {notes.length > 0 && (
            <div className="border-l-2 border-taupe-logo bg-cream px-4 py-3">
              <p className="eyebrow mb-1.5">What changed</p>
              <ul className="list-disc pl-4 text-[13px] text-ink-soft">
                {notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {changes.map((c) => (
            <label key={c.id} className={`flex cursor-pointer gap-4 border p-4 ${picked.has(c.id) ? "border-ink bg-paper" : "border-line bg-cream/40"}`}>
              <input
                type="checkbox"
                className="mt-1 accent-ink"
                checked={picked.has(c.id)}
                onChange={(e) =>
                  setPicked((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(c.id);
                    else n.delete(c.id);
                    return n;
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <p className="eyebrow mb-2">
                  {c.slide !== null && multi ? `Slide ${c.slide + 1} · ` : ""}
                  {c.label}
                </p>
                <div className="grid grid-cols-2 gap-4 text-[13.5px]">
                  <p className="whitespace-pre-wrap text-muted line-through decoration-rule">{c.before || "(empty)"}</p>
                  <p className="whitespace-pre-wrap text-ink">{c.after}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}

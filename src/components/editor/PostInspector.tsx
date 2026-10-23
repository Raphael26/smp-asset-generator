"use client";

import { useState } from "react";
import type { Asset } from "@/lib/db/schema";
import { LANGUAGES, languageOf, type AssetOptions, type LogoMode } from "@/lib/content";
import { formatLabel, getFormat, isDeck, isDocument, isSocial } from "@/lib/brand/formats";
import { UNIVERSES } from "@/lib/brand/tokens";
import { STATUS_OPTIONS } from "@/components/studio/StatusBadge";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";

export type AskCaption = (mode: "write" | "improve", instruction: string) => Promise<{ caption: string; notes: string[] } | null>;

export function PostInspector({
  asset,
  onChange,
  onOptions,
  askCaption,
  claudeReady,
}: {
  asset: Asset;
  onChange: (patch: Partial<Asset>) => void;
  onOptions: (o: Partial<AssetOptions>) => void;
  askCaption: AskCaption;
  claudeReady: boolean;
}) {
  const toast = useToast();
  const format = getFormat(asset.formatId);
  const o = asset.content.options;
  const caption = asset.content.caption;
  const [proposal, setProposal] = useState<{ caption: string; notes: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [instruction, setInstruction] = useState("");

  const setCaption = (c: string) => onChange({ content: { ...asset.content, caption: c } });

  const ask = async (mode: "write" | "improve") => {
    setBusy(true);
    setProposal(null);
    const res = await askCaption(mode, instruction);
    setBusy(false);
    if (res) setProposal(res);
  };

  return (
    <div className="flex flex-col gap-7">
      <section>
        <label className="label" htmlFor="asset-title">
          Working title
        </label>
        <input id="asset-title" className="field" value={asset.title} onChange={(e) => onChange({ title: e.target.value })} />
        <p className="mt-1.5 text-[11.5px] text-muted">
          {formatLabel(format)}{format.shape === "a4" ? "" : ` · ${format.width} × ${format.height}`}
        </p>
      </section>

      <section>
        <p className="label">Universe</p>
        <div className="flex flex-wrap gap-1.5">
          <button className="chip" aria-pressed={!asset.universe} onClick={() => onChange({ universe: null })}>
            General
          </button>
          {UNIVERSES.map((u) => (
            <button
              key={u.id}
              className="chip"
              aria-pressed={asset.universe === u.id}
              onClick={() => onChange({ universe: u.id })}
              style={asset.universe === u.id ? undefined : { background: u.tint, borderColor: u.tint }}
            >
              {u.short}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="label">Language</p>
        <div className="flex gap-1.5">
          {LANGUAGES.map((l) => (
            <button key={l.id} className="chip" aria-pressed={languageOf(o) === l.id} onClick={() => onOptions({ language: l.id })} title={l.hint}>
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-muted">
          Sets the typography, the labels the studio draws (« Source », « Glissez »…) and the language Claude writes in. It does not translate what is there: switch it, then ask in the prompt bar for « traduis tout en anglais ».
        </p>
      </section>

      <section>
        <p className="label">Logo</p>
        <div className="flex gap-1.5">
          {(
            [
              ["wordmark", "Logo"],
              ["monogram", "Monogram"],
              ["none", "None"],
            ] as [LogoMode, string][]
          ).map(([id, label]) => (
            <button key={id} className="chip" aria-pressed={o.logo === id} onClick={() => onOptions({ logo: id })}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2.5 text-[13px]">
          {asset.universe && (
            <label className="flex items-center gap-2.5">
              <input type="checkbox" className="accent-ink" checked={o.universeTag} onChange={(e) => onOptions({ universeTag: e.target.checked })} />
              Universe tag on the title slide
            </label>
          )}
          {format.multi && isSocial(format) && (
            <>
              <label className="flex items-center gap-2.5">
                <input type="checkbox" className="accent-ink" checked={o.swipeHint} onChange={(e) => onOptions({ swipeHint: e.target.checked })} />
                « {languageOf(o) === "en" ? "Swipe" : "Glissez"} → » on each slide but the last
              </label>
              <label className="flex items-center gap-2.5">
                <input type="checkbox" className="accent-ink" checked={o.pageNumbers} onChange={(e) => onOptions({ pageNumbers: e.target.checked })} />
                Page numbers
              </label>
            </>
          )}
        </div>
      </section>

      <section>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label className="label mb-0" htmlFor="caption">
            {isSocial(format) ? "Caption" : "Message to send with it"}
          </label>
          <span className="text-[11px] text-muted tabular-nums">{caption.length} characters</span>
        </div>
        <textarea
          id="caption"
          className="field"
          rows={Math.min(14, Math.max(5, caption.split("\n").length + 1))}
          placeholder={
            isDocument(format)
              ? "The e-mail to the client, or the post announcing the guide. Write it yourself, or ask Claude for a first draft."
              : isDeck(format)
                ? "The e-mail to send with the presentation. Write it yourself, or ask Claude for a first draft."
                : `The text published with the visual on ${format.platform}. Write it yourself, or ask Claude for a first draft.`
          }
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button className="btn btn-outline btn-sm" disabled={busy || !claudeReady} onClick={() => ask(caption.trim() ? "improve" : "write")}>
            <Icon name="wand" size={14} />
            {busy ? "Claude is writing…" : caption.trim() ? "Improve with Claude" : "Draft with Claude"}
          </button>
          {caption.trim() && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() =>
                navigator.clipboard
                  .writeText(caption)
                  .then(() => toast("Caption copied.", "success"))
                  .catch(() => toast("Copying is blocked here: select the caption and copy it.", "error"))
              }
            >
              <Icon name="copy" size={14} /> Copy
            </button>
          )}
        </div>
        <input
          className="field mt-2 text-[13px]"
          placeholder="Optional request: plus court, ton plus personnel…"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
        {proposal && (
          <div className="anim-rise mt-3 border border-taupe-logo/40 bg-cream p-3">
            <p className="eyebrow mb-2">Claude’s proposal</p>
            <p className="text-[13px] whitespace-pre-wrap text-ink">{proposal.caption}</p>
            {proposal.notes.length > 0 && (
              <ul className="mt-2 list-disc pl-4 text-[12px] text-muted">
                {proposal.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-1.5">
              <button
                className="btn btn-solid btn-sm"
                onClick={() => {
                  setCaption(proposal.caption);
                  setProposal(null);
                }}
              >
                Use it
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setProposal(null)}>
                Discard
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" className="field" rows={3} placeholder="Ideas, sources, who asked for it…" value={asset.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </section>

      <section>
        <p className="label">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              className="chip"
              aria-pressed={asset.status === s.id}
              onClick={() =>
                onChange({
                  status: s.id,
                  ...(s.id === "published" && !asset.publishedAt ? { publishedAt: new Date().toISOString().slice(0, 10) } : {}),
                })
              }
            >
              {s.label}
            </button>
          ))}
        </div>
        {asset.status === "published" && (
          <div className="mt-3 grid grid-cols-[130px_1fr] gap-2">
            <input type="date" className="field" value={asset.publishedAt?.slice(0, 10) ?? ""} onChange={(e) => onChange({ publishedAt: e.target.value })} />
            <input className="field" placeholder="Link to the post" value={asset.publishedUrl ?? ""} onChange={(e) => onChange({ publishedUrl: e.target.value })} />
          </div>
        )}
      </section>
    </div>
  );
}

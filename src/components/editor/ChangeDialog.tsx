"use client";

import type { Asset } from "@/lib/db/schema";
import type { AssetContent } from "@/lib/content";
import { getFormat } from "@/lib/brand/formats";
import { Modal } from "@/components/ui/Modal";
import { ScaledSlide, previewUrl } from "@/components/slides/ScaledSlide";
import { usd } from "@/components/ui/api";

export type Proposal = { title: string; formatId: string; universe: string | null; content: AssetContent; notes: string[]; generate: { slideId: string; prompt: string }[] };

function Strip({ asset, content, label, generating }: { asset: Asset; content: AssetContent; label: string; generating?: Set<string> }) {
  const format = getFormat(asset.formatId);
  const w = format.width >= format.height ? 210 : 132;
  return (
    <div>
      <p className="eyebrow mb-2">
        {label} · {content.slides.length} slide{content.slides.length > 1 ? "s" : ""}
      </p>
      <div className="scroll-thin flex gap-3 overflow-x-auto pb-2">
        {content.slides.map((s, i) => (
          <div key={s.id + i} className="relative shrink-0 border border-line">
            <ScaledSlide
              width={w}
              format={format}
              slide={generating?.has(s.id) ? { ...s, photoJob: "pending" } : s}
              index={i}
              total={content.slides.length}
              universeId={asset.universe}
              options={content.options}
              mediaUrl={previewUrl(300)}
              placeholders
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** What Claude proposes after a change request or a regeneration: before and after, applied only if Rebeca says so. */
export function ChangeDialog({
  open,
  onClose,
  asset,
  proposal,
  mode,
  onApply,
  photosEnabled,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  proposal: Proposal;
  mode: "edit" | "regenerate";
  onApply: () => void;
  /** False when the Replicate key is missing: photos stay as prompts. */
  photosEnabled: boolean;
}) {
  const generating = new Set(photosEnabled ? proposal.generate.map((g) => g.slideId) : []);
  const captionChanged = proposal.content.caption.trim() !== asset.content.caption.trim();
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Claude"
      title={mode === "edit" ? <>Here is <em>the change.</em></> : <>A new version, <em>from your prompt.</em></>}
      width={1040}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Discard
          </button>
          <button className="btn btn-solid" onClick={onApply}>
            Apply{photosEnabled && proposal.generate.length ? ` and generate ${proposal.generate.length} photo${proposal.generate.length > 1 ? "s" : ""}` : ""}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {proposal.notes.length > 0 && (
          <div className="border-l-2 border-taupe-logo bg-cream px-4 py-3">
            <ul className="list-disc pl-4 text-[13px] text-ink-soft">
              {proposal.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <Strip asset={asset} content={asset.content} label="Now" />
        <Strip asset={asset} content={proposal.content} label="Proposed" generating={generating} />
        {captionChanged && (
          <div>
            <p className="eyebrow mb-2">Caption</p>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <p className="max-h-[160px] overflow-y-auto whitespace-pre-wrap text-muted line-through decoration-rule">{asset.content.caption || "(empty)"}</p>
              <p className="max-h-[160px] overflow-y-auto whitespace-pre-wrap text-ink">{proposal.content.caption}</p>
            </div>
          </div>
        )}
        {proposal.generate.length > 0 && !photosEnabled && (
          <p className="text-[12.5px] text-flag">
            {proposal.generate.length} photo{proposal.generate.length > 1 ? "s" : ""} described by Claude can’t be generated: the Replicate key is missing. The prompts are kept on the slides.
          </p>
        )}
        {proposal.generate.length > 0 && photosEnabled && (
          <p className="text-[12.5px] text-muted">
            {proposal.generate.length} new photo{proposal.generate.length > 1 ? "s" : ""} will be generated after you apply (about {usd(0.1 * proposal.generate.length)}), and appear in their slides within a minute. The current version is kept in the history.
          </p>
        )}
      </div>
    </Modal>
  );
}

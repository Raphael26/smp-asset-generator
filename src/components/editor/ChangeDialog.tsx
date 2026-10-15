"use client";

import { useState } from "react";
import type { Asset } from "@/lib/db/schema";
import type { AssetContent } from "@/lib/content";
import { getFormat } from "@/lib/brand/formats";
import { Modal } from "@/components/ui/Modal";
import { ScaledSlide, previewUrl } from "@/components/slides/ScaledSlide";
import { usd } from "@/components/ui/api";
import { Switch } from "@/components/ui/Switch";

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
  autoPhotos,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  proposal: Proposal;
  mode: "edit" | "regenerate";
  /** Whether to start the photos Claude described once the change is applied. */
  onApply: (generatePhotos: boolean) => void;
  /** False when the Replicate key is missing: photos stay as prompts. */
  photosEnabled: boolean;
  /** Rebeca's default for generating photos right away (Settings › autoPhotos). */
  autoPhotos: boolean;
}) {
  const [generatePhotos, setGeneratePhotos] = useState(autoPhotos);
  const count = proposal.generate.length;
  const willGenerate = photosEnabled && generatePhotos && count > 0;
  const generating = new Set(willGenerate ? proposal.generate.map((g) => g.slideId) : []);
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
          <button className="btn btn-solid" onClick={() => onApply(willGenerate)}>
            Apply{willGenerate ? ` and generate ${count} photo${count > 1 ? "s" : ""}` : ""}
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
        {count > 0 && !photosEnabled && (
          <p className="text-[12.5px] text-flag">
            {count} photo{count > 1 ? "s" : ""} described by Claude can’t be generated: the Replicate key is missing. The prompts are kept on the slides.
          </p>
        )}
        {count > 0 && photosEnabled && (
          <div className="flex flex-col gap-1.5">
            <Switch checked={generatePhotos} onChange={setGeneratePhotos}>
              Generate the {count} new photo{count > 1 ? "s" : ""} now
            </Switch>
            <p className="text-[12.5px] text-muted">
              {generatePhotos
                ? `${count > 1 ? "They are" : "It is"} generated after you apply (about ${usd(0.1 * count)}) and appear${count > 1 ? "" : "s"} in ${count > 1 ? "their slides" : "its slide"} within a minute. The current version is kept in the history.`
                : `The prompt${count > 1 ? "s are" : " is"} kept on ${count > 1 ? "their slides" : "its slide"}: generate ${count > 1 ? "each one" : "it"} from the slide when you want ($0.10 each). The current version is kept in the history.`}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

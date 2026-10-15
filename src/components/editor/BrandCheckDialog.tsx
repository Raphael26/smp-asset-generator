"use client";

import type { Asset } from "@/lib/db/schema";
import type { Issue } from "@/lib/brand/lint";
import { getLayout } from "@/lib/brand/layouts";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";

const LABEL = { error: "To fix", warning: "To check", tip: "Good to know" } as const;

export function BrandCheckDialog({ open, onClose, asset, issues, onGo }: { open: boolean; onClose: () => void; asset: Asset; issues: Issue[]; onGo: (i: Issue) => void }) {
  const multi = asset.content.slides.length > 1;
  const where = (i: Issue) => {
    if (i.slide === null) return "Caption";
    const s = asset.content.slides[i.slide];
    const f = s ? getLayout(s.layout).fields.find((x) => x.key === i.field) : null;
    return `${multi ? `Slide ${i.slide + 1} · ` : ""}${f?.label ?? (i.field === "image" ? "Photo" : i.field ?? "")}`;
  };
  return (
    <Modal open={open} onClose={onClose} eyebrow="Brand check" title={issues.length ? <>A few things <em>to look at.</em></> : <>On brand.</>} width={680}>
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 text-ink-soft">
          <Icon name="check" size={16} /> No emoji or exclamation marks, figures have their sources, titles end properly, every text fits.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {(["error", "warning", "tip"] as const).map((sev) => {
            const list = issues.filter((i) => i.severity === sev);
            if (!list.length) return null;
            return (
              <section key={sev}>
                <p className={`eyebrow mb-2 ${sev === "error" ? "text-flag" : ""}`}>
                  {LABEL[sev]} · {list.length}
                </p>
                <ul className="divide-y divide-line border-y border-line">
                  {list.map((i, k) => (
                    <li key={k}>
                      <button
                        className="flex w-full items-start justify-between gap-4 py-2.5 text-left hover:bg-cream"
                        onClick={() => {
                          onGo(i);
                          onClose();
                        }}
                      >
                        <span className="text-[13.5px] text-ink">{i.message}</span>
                        <span className="shrink-0 text-[12px] text-muted">{where(i)} →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="text-[12px] text-muted">These checks follow the brand guidelines (rules 2–10 and the voice section). For a reading of the tone and the facts, use « Review with Claude ».</p>
        </div>
      )}
    </Modal>
  );
}

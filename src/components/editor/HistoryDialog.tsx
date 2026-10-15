"use client";

import { useEffect, useState } from "react";
import type { Asset, Revision } from "@/lib/db/schema";
import { Modal } from "@/components/ui/Modal";
import { AssetThumb } from "@/components/studio/AssetThumb";
import { api, relativeTime } from "@/components/ui/api";
import { useToast } from "@/components/ui/Toaster";

export function HistoryDialog({
  open,
  onClose,
  asset,
  flush,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  flush: () => Promise<void>;
  onRestored: (a: Asset) => void;
}) {
  const toast = useToast();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) api<{ revisions: Revision[] }>(`/api/assets/${asset.id}/revisions`).then((d) => setRevisions(d.revisions));
  }, [open, asset.id]);

  const save = async () => {
    await flush();
    const d = await api<{ revisions: Revision[] }>(`/api/assets/${asset.id}/revisions`, { method: "POST", json: { reason: name.trim() || "Saved version" } });
    setRevisions(d.revisions);
    setName("");
    toast("Version saved.", "success");
  };

  const restore = async (r: Revision) => {
    await flush();
    const { asset: restored } = await api<{ asset: Asset }>(`/api/assets/${asset.id}/revisions`, { method: "POST", json: { restore: r.id } });
    onRestored(restored);
    toast("Older version restored. The text you had is kept in the history.", "success");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="History" title={<>Earlier <em>versions.</em></>} width={760}>
      <div className="mb-6 flex gap-2">
        <input className="field" placeholder="Name this version (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-outline shrink-0" onClick={save}>
          Save current version
        </button>
      </div>
      {revisions.length === 0 ? (
        <p className="text-[13px] text-muted">No versions yet. One is kept automatically before each Claude edit and at each export.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {revisions.map((r) => (
            <li key={r.id} className="flex items-center gap-4 py-3">
              <AssetThumb asset={{ ...asset, title: r.title, content: r.content }} boxWidth={64} boxHeight={64} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">{r.reason}</p>
                <p className="text-[12px] text-muted">
                  {relativeTime(r.createdAt)} · {r.content.slides.length} slide{r.content.slides.length > 1 ? "s" : ""}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => restore(r)}>
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

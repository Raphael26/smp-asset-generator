"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Asset } from "@/lib/db/schema";
import { FORMATS, isDeck } from "@/lib/brand/formats";
import { api } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";

/** « New presentation »: a blank deck straight into the editor, no prompt. One choice: the kind of deck. */
export function NewPresentation({ className = "btn btn-outline" }: { className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async (formatId: string) => {
    setBusy(true);
    try {
      const { asset } = await api<{ asset: Asset }>("/api/assets", { method: "POST", json: { title: "Nouvelle présentation", formatId, universe: null, starterId: "blank" } });
      router.push(`/assets/${asset.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button className={className} disabled={busy} onClick={() => setOpen((o) => !o)}>
        <Icon name="layers" size={15} /> {busy ? "Creating…" : "New presentation"}
      </button>
      {open && !busy && (
        <div className="anim-rise absolute right-0 z-20 mt-1 w-[300px] border border-line bg-paper py-1 shadow-[0_12px_30px_-14px_rgba(48,43,39,.4)]">
          {FORMATS.filter(isDeck).map((f) => (
            <button
              key={f.id}
              className="block w-full px-4 py-2.5 text-left hover:bg-cream"
              onClick={() => {
                setOpen(false);
                create(f.id);
              }}
            >
              <span className="block text-[13.5px]">{f.name}</span>
              <span className="block text-[11.5px] leading-snug text-muted">{f.hint}</span>
            </button>
          ))}
          <p className="px-4 pt-2 pb-1.5 text-[11px] leading-snug text-muted">A blank title slide, 16:9, to lay out yourself. The prompt bar stays under the preview for when you want Claude to write or change something.</p>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Asset } from "@/lib/db/schema";
import { FORMATS, PLATFORMS, getFormat } from "@/lib/brand/formats";
import { UNIVERSES, universe } from "@/lib/brand/tokens";
import { api, relativeTime } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";
import { AssetThumb } from "@/components/studio/AssetThumb";
import { StatusBadge } from "@/components/studio/StatusBadge";

const STATUSES = [
  { id: "draft", label: "Drafts" },
  { id: "ready", label: "Ready" },
  { id: "published", label: "Published" },
];

export default function LibraryPage() {
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string | null>(null);
  const [uni, setUni] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (uni) p.set("universe", uni);
    if (status) p.set("status", status);
    api<{ assets: Asset[] }>(`/api/assets?${p}`)
      .then((d) => setAssets(d.assets))
      .catch((e) => toast(e.message, "error"));
  }, [q, uni, status, toast]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const shown = (assets ?? []).filter((a) => !platform || getFormat(a.formatId).platform === platform);

  const duplicate = async (a: Asset) => {
    const { asset } = await api<{ asset: Asset }>(`/api/assets/${a.id}/duplicate`, { method: "POST" });
    router.push(`/assets/${asset.id}`);
  };
  const remove = async (a: Asset) => {
    if (!confirm(`Delete « ${a.title} »? Its exports and versions go too. This cannot be undone.`)) return;
    await api(`/api/assets/${a.id}`, { method: "DELETE" });
    toast("Asset deleted.");
    load();
  };

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-12">
      <header className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Library</p>
          <h1 className="display text-[56px]">
            Your visuals, <em>in one place.</em>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/new" className="btn btn-outline">
            <Icon name="plus" size={15} /> From a template
          </Link>
          <Link href="/" className="btn btn-solid">
            <Icon name="wand" size={15} /> Create from a prompt
          </Link>
        </div>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4">
        <label className="relative">
          <Icon name="search" size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-taupe" />
          <input className="field w-[260px] pl-9" placeholder="Search titles and text" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <button key={p} className="chip" aria-pressed={platform === p} onClick={() => setPlatform(platform === p ? null : p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {UNIVERSES.map((u) => (
            <button
              key={u.id}
              className="chip"
              aria-pressed={uni === u.id}
              onClick={() => setUni(uni === u.id ? null : u.id)}
              style={uni === u.id ? undefined : { background: u.tint, borderColor: u.tint }}
            >
              {u.short}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button key={s.id} className="chip" aria-pressed={status === s.id} onClick={() => setStatus(status === s.id ? null : s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {assets === null ? (
        <p className="text-taupe">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="panel flex flex-col items-center gap-4 px-8 py-20 text-center">
          <h2 className="display text-[34px]">{assets.length ? "Nothing matches these filters." : <>Your first visual <em>starts here.</em></>}</h2>
          <p className="max-w-[460px] text-ink-soft">
            {assets.length ? "Clear a filter to see more." : "Describe what you want: Claude writes it in Rebeca’s voice, the studio lays it out in the brand’s fonts and colours, and the photos are generated to match."}
          </p>
          {!assets.length && (
            <Link href="/" className="btn btn-solid mt-2">
              Create from a prompt <Icon name="arrowRight" size={15} />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,300px)] gap-x-6 gap-y-10">
          {shown.map((a) => {
            const f = getFormat(a.formatId);
            const u = universe(a.universe);
            return (
              <article key={a.id} className="group">
                <Link href={`/assets/${a.id}`} className="block">
                  <AssetThumb asset={a} boxWidth={300} boxHeight={300} />
                </Link>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/assets/${a.id}`} className="line-clamp-2 block font-display text-[19px] leading-snug font-light hover:underline">
                      {a.title}
                    </Link>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {f.platform} {f.name.toLowerCase()}
                      {f.multi ? ` · ${a.content.slides.length} slides` : ""} · {relativeTime(a.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button className="btn btn-ghost btn-sm" title="Duplicate" onClick={() => duplicate(a)}>
                      <Icon name="copy" size={15} />
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => remove(a)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <StatusBadge status={a.status} />
                  {u && (
                    <span className="tag" style={{ background: u.tint, color: u.tintInk }}>
                      {u.short}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-16 text-[12px] text-muted">
        {FORMATS.length} formats available · Everything is saved on this computer, in the project’s data folder.
      </p>
    </div>
  );
}

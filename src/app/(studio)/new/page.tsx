"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Asset } from "@/lib/db/schema";
import { FORMATS, PLATFORMS, isDocument, withOrientation, type Format } from "@/lib/brand/formats";
import { getLayout, startersFor } from "@/lib/brand/layouts";
import { UNIVERSES } from "@/lib/brand/tokens";
import { api } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";
import { OrientationChoice } from "@/components/studio/OrientationChoice";

function FormatShape({ f }: { f: Format }) {
  const max = 64;
  const w = f.width >= f.height ? max : (max * f.width) / f.height;
  const h = f.height >= f.width ? max : (max * f.height) / f.width;
  return (
    <div className="flex h-[70px] w-[70px] items-center justify-center">
      <div className="border border-rule bg-cream" style={{ width: w, height: h }}>
        {f.multi && <div className="h-full w-full translate-x-[5px] -translate-y-[5px] border border-rule bg-paper" />}
      </div>
    </div>
  );
}

export default function NewAssetPage() {
  const router = useRouter();
  const toast = useToast();
  const [format, setFormat] = useState<Format | null>(null);
  // Orientation of the A4 documents, offered under them.
  const [landscape, setLandscape] = useState(false);
  const [title, setTitle] = useState("");
  const [uni, setUni] = useState<string | null>(null);
  const [starter, setStarter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const starters = format ? startersFor(format) : [];
  const chosenStarter = starters.find((s) => s.id === starter) ?? starters[0];
  const isDoc = format?.shape === "a4";

  const create = async () => {
    if (!format) return;
    setBusy(true);
    try {
      const { asset } = await api<{ asset: Asset }>("/api/assets", {
        method: "POST",
        json: { title: title || "Untitled", formatId: format.id, universe: uni, starterId: chosenStarter.id },
      });
      router.push(`/assets/${asset.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1080px] px-10 py-12">
      <p className="eyebrow mb-3">From a template</p>
      <h1 className="display mb-4 text-[56px]">
        Start from a blank <em>template.</em>
      </h1>
      <p className="mb-12 text-ink-soft">
        You write every text yourself. To describe what you want and let the studio write it, use{" "}
        <Link href="/" className="underline underline-offset-4">
          Create from a prompt
        </Link>
        .
      </p>

      <section className="mb-14">
        <h2 className="mb-5 flex items-baseline gap-3 font-display text-[24px] font-light">
          <span className="text-taupe-logo">1</span> Format
        </h2>
        <div className="grid grid-cols-4 gap-5">
          {PLATFORMS.map((p) => (
            <div key={p}>
              <p className="eyebrow mb-3">{p}</p>
              <div className="flex flex-col gap-2">
                {FORMATS.filter((f) => f.platform === p)
                  .map((f) => withOrientation(f, landscape))
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFormat(f);
                        setStarter(null);
                      }}
                      className={`flex items-center gap-3 border p-2 pr-4 text-left transition-colors ${
                        format?.id === f.id ? "border-ink bg-paper" : "border-line bg-paper/60 hover:border-rule hover:bg-paper"
                      }`}
                    >
                      <FormatShape f={f} />
                      <span>
                        <span className="block text-[14px] font-medium">{f.name}</span>
                        <span className="block text-[12px] text-muted">
                          {f.shape === "a4" ? "A4 PDF" : `${f.width} × ${f.height}`} · {f.hint}
                        </span>
                      </span>
                    </button>
                  ))}
                {p === "Document" && (
                  <OrientationChoice
                    landscape={landscape}
                    onChange={(l) => {
                      setLandscape(l);
                      if (format && isDocument(format)) setFormat(withOrientation(format, l));
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {format && (
        <section className="anim-rise mb-14">
          <h2 className="mb-5 flex items-baseline gap-3 font-display text-[24px] font-light">
            <span className="text-taupe-logo">2</span> About it
          </h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="label" htmlFor="title">
                Working title
              </label>
              <input
                id="title"
                className="field"
                placeholder="La charge mentale au bureau"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <p className="mt-2 text-[12px] text-muted">For you only: it names the asset in the library and the exported files.</p>
            </div>
            <div>
              <span className="label">Universe</span>
              <div className="flex flex-wrap gap-2">
                <button className="chip" aria-pressed={uni === null} onClick={() => setUni(null)}>
                  General
                </button>
                {UNIVERSES.map((u) => (
                  <button
                    key={u.id}
                    className="chip"
                    aria-pressed={uni === u.id}
                    onClick={() => setUni(u.id)}
                    style={uni === u.id ? undefined : { background: u.tint, borderColor: u.tint }}
                  >
                    {u.number} — {u.short}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-muted">Each tint belongs to its universe: it is used for the tag, never as decoration.</p>
            </div>
          </div>
        </section>
      )}

      {format && (
        <section className="anim-rise mb-12">
          <h2 className="mb-5 flex items-baseline gap-3 font-display text-[24px] font-light">
            <span className="text-taupe-logo">3</span> Start from
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {starters.map((s) => (
              <button
                key={s.id}
                onClick={() => setStarter(s.id)}
                className={`border p-5 text-left transition-colors ${chosenStarter.id === s.id ? "border-ink bg-paper" : "border-line bg-paper/60 hover:border-rule hover:bg-paper"}`}
              >
                <span className="block font-display text-[20px] font-light">{s.name}</span>
                <span className="mt-1 block text-[13px] text-ink-soft">{s.description}</span>
                {format.multi && (
                  <span className="mt-3 block text-[11.5px] text-muted">{s.slides.map((x) => getLayout(x.layout).name).join(" · ")}</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">You can change templates, add or remove {isDoc ? "pages" : "slides"} later.</p>
        </section>
      )}

      <div className="flex justify-end border-t border-line pt-6">
        <button className="btn btn-solid" disabled={!format || busy} onClick={create}>
          {busy ? "Creating…" : "Create and start writing"} <Icon name="arrowRight" size={15} />
        </button>
      </div>
    </div>
  );
}

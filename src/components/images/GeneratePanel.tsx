"use client";

import { useEffect, useState } from "react";
import type { Job, Media } from "@/lib/db/schema";
import { PHOTO_PRESETS } from "@/lib/brand/image-presets";
import { IMAGE_MODELS } from "@/lib/ai/pricing";
import { api, usd } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";
import { useJobs } from "./useJobs";

const SHAPES = [
  { id: "4:5", label: "Portrait 4:5", w: 1080, h: 1350 },
  { id: "1:1", label: "Square", w: 1080, h: 1080 },
  { id: "9:16", label: "Story 9:16", w: 1080, h: 1920 },
  { id: "3:2", label: "Landscape 3:2", w: 1500, h: 1000 },
  { id: "16:9", label: "Wide 16:9", w: 1920, h: 1080 },
];

type SettingsResponse = { settings: { defaultImageModel: string; defaultUpscale: boolean }; keys: { anthropic: boolean; replicate: boolean } };

/**
 * Generate photos with Flux 2. Rebeca describes the image in her words (or picks a scene);
 * Claude can turn that into a detailed English prompt first. Text never goes into the image.
 */
export function GeneratePanel({
  frame,
  assetId,
  onReady,
  onSelect,
  initialPrompt,
}: {
  /** Size of the photo frame of the slide, when generating for a slide. */
  frame: { width: number; height: number } | null;
  assetId?: string | null;
  onReady: (m: Media) => void;
  onSelect?: (mediaId: string) => void;
  initialPrompt?: string | null;
}) {
  const toast = useToast();
  const [idea, setIdea] = useState("");
  const [preset, setPreset] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [summary, setSummary] = useState("");
  const [writing, setWriting] = useState(false);
  const [model, setModel] = useState<string>(IMAGE_MODELS[0].id);
  const [upscale, setUpscale] = useState(false);
  const [count, setCount] = useState(2);
  const [shape, setShape] = useState(SHAPES[0].id);
  const [estimate, setEstimate] = useState<{ costUsd: number; width: number; height: number } | null>(null);
  const [keys, setKeys] = useState<SettingsResponse["keys"] | null>(null);
  const [results, setResults] = useState<Record<string, string>>({}); // jobId → mediaId

  const size = frame ?? (() => {
    const s = SHAPES.find((x) => x.id === shape)!;
    return { width: s.w, height: s.h };
  })();

  const { jobs, add, busy } = useJobs(
    (job: Job) => {
      if (!job.mediaId) return;
      setResults((r) => ({ ...r, [job.id]: job.mediaId! }));
      api<{ media: Media[] }>("/api/media").then(({ media }) => {
        const m = media.find((x) => x.id === job.mediaId);
        if (m) onReady(m);
      });
    },
    (msg) => toast(msg, "error"),
  );

  useEffect(() => {
    api<SettingsResponse>("/api/settings")
      .then((d) => {
        setModel(d.settings.defaultImageModel);
        setUpscale(d.settings.defaultUpscale);
        setKeys(d.keys);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ costUsd: number; width: number; height: number }>("/api/images", {
        method: "POST",
        json: { action: "estimate", model, frameWidth: size.width, frameHeight: size.height, count, upscale },
      })
        .then(setEstimate)
        .catch(() => setEstimate(null));
    }, 150);
    return () => clearTimeout(t);
  }, [model, size.width, size.height, count, upscale]);

  const writePrompt = async () => {
    setWriting(true);
    try {
      const out = await api<{ prompt: string; summary: string }>("/api/images", {
        method: "POST",
        json: { action: "prompt", idea, presetId: preset, frameWidth: size.width, frameHeight: size.height, assetId },
      });
      setPrompt(out.prompt);
      setSummary(out.summary);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setWriting(false);
    }
  };

  const generate = async () => {
    try {
      const { jobs: created } = await api<{ jobs: Job[] }>("/api/images", {
        method: "POST",
        json: { action: "generate", prompt, idea, presetId: preset, model, frameWidth: size.width, frameHeight: size.height, count, upscale, label: summary || idea.slice(0, 60) || PHOTO_PRESETS.find((p) => p.id === preset)?.name || "", assetId },
      });
      add(created);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const canGenerate = Boolean(prompt.trim() || idea.trim() || preset) && keys?.replicate !== false;

  return (
    <div className="grid grid-cols-[1fr_300px] gap-8">
      <div className="flex flex-col gap-5">
        <div>
          <label className="label" htmlFor="idea">
            Describe the photo
          </label>
          <textarea
            id="idea"
            className="field"
            rows={3}
            placeholder="Un salon lumineux avec un canapé en lin, un panier de jouets rangé, la lumière de fin d’après-midi…"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <p className="mt-1.5 text-[11.5px] text-muted">In French or English. The image never contains text: titles are set by the studio.</p>
        </div>
        <div>
          <p className="label">Or start from a scene</p>
          <div className="flex flex-wrap gap-1.5">
            {PHOTO_PRESETS.map((p) => (
              <button key={p.id} className="chip" aria-pressed={preset === p.id} onClick={() => setPreset(preset === p.id ? null : p.id)} title={p.scene}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-line pt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="label mb-0">Prompt sent to the image model</p>
            <button className="btn btn-outline btn-sm" onClick={writePrompt} disabled={writing || keys?.anthropic === false || !(idea.trim() || preset)}>
              <Icon name="wand" size={14} /> {writing ? "Claude is writing…" : prompt ? "Rewrite with Claude" : "Write it with Claude"}
            </button>
          </div>
          <textarea
            className="field text-[13px]"
            rows={5}
            placeholder="Optional. Leave empty to use your description and the scene as they are, or let Claude write a detailed English prompt following the brand’s photography direction."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          {summary && <p className="mt-1.5 text-[12px] text-ink-soft italic">{summary}</p>}
        </div>

        {jobs.length > 0 && (
          <div className="border-t border-line pt-5">
            <p className="label">Results</p>
            <div className="grid grid-cols-4 gap-3">
              {jobs.map((j) => {
                const mediaId = results[j.id] ?? (j.status === "succeeded" ? j.mediaId : null);
                return (
                  <div key={j.id} className="relative aspect-square border border-line bg-stone">
                    {mediaId ? (
                      <button className="group block h-full w-full" onClick={() => onSelect?.(mediaId)} title={onSelect ? "Use this photo" : undefined}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/media/${mediaId}/file?w=360`} alt="" className="h-full w-full object-cover" />
                        {onSelect && <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1.5 text-center text-[11px] tracking-[.13em] text-cream uppercase opacity-0 group-hover:opacity-100">Use this</span>}
                      </button>
                    ) : j.status === "running" ? (
                      <div className="anim-pulse flex h-full flex-col items-center justify-center gap-1 text-[11.5px] text-taupe">
                        <span>{j.stage === "upscale" ? "Sharpening…" : "Generating…"}</span>
                        <span className="text-muted">20–40 s</span>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-[11.5px] text-flag">{j.status === "canceled" ? "Canceled" : "Failed"}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-5 border-l border-line pl-8">
        {frame ? (
          <div>
            <p className="label">Shape</p>
            <p className="text-[13px] text-ink-soft">
              Fits this slide’s photo frame{estimate ? ` (${estimate.width} × ${estimate.height})` : ""}.
            </p>
          </div>
        ) : (
          <div>
            <p className="label">Shape</p>
            <div className="flex flex-wrap gap-1.5">
              {SHAPES.map((s) => (
                <button key={s.id} className="chip" aria-pressed={shape === s.id} onClick={() => setShape(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="label">Model</p>
          <div className="flex flex-col gap-1.5">
            {IMAGE_MODELS.map((m) => (
              <label key={m.id} className={`flex cursor-pointer gap-2.5 border p-2.5 text-[13px] ${model === m.id ? "border-ink" : "border-line"}`}>
                <input type="radio" className="mt-1 accent-ink" checked={model === m.id} onChange={() => setModel(m.id)} />
                <span>
                  <span className="block font-medium">{m.name}</span>
                  <span className="block text-[12px] text-muted">{m.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer gap-2.5 text-[13px]">
          <input type="checkbox" className="mt-1 accent-ink" checked={upscale} onChange={(e) => setUpscale(e.target.checked)} />
          <span>
            <span className="block font-medium">Sharpen with Topaz</span>
            <span className="block text-[12px] text-muted">Doubles the resolution for crisper detail. About +$0.05 an image.</span>
          </span>
        </label>
        <div>
          <p className="label">How many</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="chip w-9 justify-center" aria-pressed={count === n} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-auto border-t border-line pt-5">
          {keys?.replicate === false && <p className="mb-3 text-[12.5px] text-flag">Add REPLICATE_API_TOKEN to .env to generate images.</p>}
          <button className="btn btn-solid w-full" disabled={!canGenerate} onClick={generate}>
            Generate {count} image{count > 1 ? "s" : ""}
          </button>
          <p className="mt-2 text-center text-[12px] text-muted">
            {estimate ? `About ${usd(estimate.costUsd)}` : "…"}
            {busy ? " · working…" : ""}
          </p>
        </div>
      </aside>
    </div>
  );
}

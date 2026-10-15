"use client";

import { useEffect, useState } from "react";
import { IMAGE_MODELS } from "@/lib/ai/pricing";
import { api } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";

type Data = {
  settings: { monthlyBudgetUsd: number; defaultImageModel: string; defaultUpscale: boolean };
  keys: { anthropic: boolean; replicate: boolean };
};

function KeyRow({ ok, name, v, url }: { ok: boolean; name: string; v: string; url: string }) {
return (
  <li className="flex items-start gap-4 py-4">
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? "bg-sauge text-sauge-ink" : "bg-blush text-flag"}`}>
      <Icon name={ok ? "check" : "alert"} size={13} />
    </span>
    <div>
      <p className="text-[14px]">
        {name} · {ok ? "connected" : "missing"}
      </p>
      <p className="mt-0.5 text-[12.5px] text-muted">
        {ok ? (
          <>
            Read from <code>{v}</code> in the .env file.
          </>
        ) : (
          <>
            Add a line <code className="bg-stone px-1">{v}=…</code> to the .env file at the root of the project, then restart the app. Get a key on{" "}
            <a className="underline" href={url} target="_blank" rel="noreferrer">
              {url.replace("https://", "")}
            </a>
            .
          </>
        )}
      </p>
    </div>
  </li>
);
}

export default function SettingsPage() {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    api<Data>("/api/settings").then(setD);
  }, []);
  if (!d) return <p className="p-16 text-taupe">Loading…</p>;

  const save = async (patch: Partial<Data["settings"]>) => {
    const { settings } = await api<{ settings: Data["settings"] }>("/api/settings", { method: "PUT", json: patch });
    setD({ ...d, settings });
    toast("Saved.", "success");
  };


  return (
    <div className="mx-auto max-w-[820px] px-10 py-12">
      <p className="eyebrow mb-3">Settings</p>
      <h1 className="display mb-10 text-[56px]">
        How the studio <em>works.</em>
      </h1>

      <section className="mb-12">
        <h2 className="mb-2 font-display text-[22px] font-light">Connections</h2>
        <ul className="divide-y divide-line border-y border-line">
          <KeyRow ok={d.keys.anthropic} name="Claude (Anthropic)" v="ANTHROPIC_API_KEY" url="https://console.anthropic.com/settings/keys" />
          <KeyRow ok={d.keys.replicate} name="Images (Replicate)" v="REPLICATE_API_TOKEN" url="https://replicate.com/account/api-tokens" />
        </ul>
        <p className="mt-3 text-[12.5px] text-muted">The keys stay on this computer. Claude writes and reviews text; Replicate runs Flux 2 for photos and Topaz for sharpening.</p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-[22px] font-light">Images</h2>
        <p className="label">Default model</p>
        <div className="mb-5 flex flex-col gap-2">
          {IMAGE_MODELS.map((m) => (
            <label key={m.id} className={`flex cursor-pointer gap-3 border p-3 text-[13.5px] ${d.settings.defaultImageModel === m.id ? "border-ink bg-paper" : "border-line"}`}>
              <input type="radio" className="mt-1 accent-ink" checked={d.settings.defaultImageModel === m.id} onChange={() => save({ defaultImageModel: m.id })} />
              <span>
                <span className="block font-medium">{m.name}</span>
                <span className="block text-[12.5px] text-muted">{m.description}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="flex items-center gap-3 text-[13.5px]">
          <input type="checkbox" className="accent-ink" checked={d.settings.defaultUpscale} onChange={(e) => save({ defaultUpscale: e.target.checked })} />
          Sharpen new images with Topaz by default
        </label>
      </section>

      <section className="mb-12">
        <h2 className="mb-2 font-display text-[22px] font-light">Where things are</h2>
        <p className="text-[13.5px] text-ink-soft">
          Everything the studio makes is kept in the <code className="bg-stone px-1">data</code> folder of the project: the database (<code>studio.db</code>), the images (<code>media</code>) and the exports (<code>exports</code>). To back it up, copy that folder.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-[22px] font-light">The brand rules</h2>
        <p className="text-[13.5px] text-ink-soft">
          Colours, typefaces and templates follow the Spanish Mum in Paris brand guidelines (v1.0, October 2026). The voice Claude follows is in <code className="bg-stone px-1">src/lib/brand/voice.ts</code>; the brand check rules are in <code className="bg-stone px-1">src/lib/brand/lint.ts</code>.
        </p>
      </section>
    </div>
  );
}

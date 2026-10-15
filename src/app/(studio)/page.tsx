"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Asset, CreateOptions } from "@/lib/db/schema";
import { FORMATS, PLATFORMS, getFormat, isDocument, isLandscape, withOrientation } from "@/lib/brand/formats";
import { UNIVERSES } from "@/lib/brand/tokens";
import { api, relativeTime } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";
import { Switch } from "@/components/ui/Switch";
import { AssetThumb } from "@/components/studio/AssetThumb";
import { OrientationChoice } from "@/components/studio/OrientationChoice";

const EXAMPLES: { label: string; prompt: string; options?: Partial<CreateOptions> }[] = [
  {
    label: "LinkedIn carousel for HR",
    prompt:
      "Un carrousel LinkedIn pour les DRH sur la charge mentale des parents salariés. Chiffres à utiliser : +60 % des femmes vivant avec un enfant de moins de 15 ans déclarent une charge mentale lourde, contre 40 % des hommes (INED, 2026) ; 40 % des actifs français ont déjà quitté un poste incompatible avec leur vie personnelle (Randstad Workmonitor, 2026). Terminer par les ateliers Home & Life Balance.",
    options: { formatId: "linkedin-carousel", universe: "entreprises", images: "none" },
  },
  {
    label: "Instagram tips with photos",
    prompt: "Un carrousel Instagram : 3 astuces simples pour une entrée bien rangée quand on a des enfants (patères à leur hauteur, un panier par enfant, un vide-poche pour les clés). Ton chaleureux, avec des photos d’entrées parisiennes.",
    options: { formatId: "instagram-carousel", universe: "organisation", images: "ai" },
  },
  {
    label: "Post about the Room Makeover",
    prompt: "Un post LinkedIn pour présenter la formule Room Makeover à 350 € : moodboard, palette, suggestions de mobilier, shopping list, un aller-retour de modifications, à distance. Avec une photo de salon lumineux.",
    options: { formatId: "linkedin-post", universe: "decoration", images: "auto" },
  },
  {
    label: "Story with Rebeca",
    prompt: "Une story Instagram pour dire bonjour : « Bonjour, je suis Rebeca », Espagnole de naissance, Parisienne d’adoption, maman, et je vous aide à créer une maison belle et facile à vivre. Avec ma photo.",
    options: { formatId: "instagram-story", universe: "none", images: "library" },
  },
  {
    label: "PDF guide to share",
    prompt: "Un guide PDF « Une entrée rangée, des matins plus doux » : 5 idées simples pour organiser l’entrée quand on a des enfants (patères à leur hauteur, un panier par enfant, un vide-poche, un banc pour les chaussures, une routine du soir). Une checklist de la routine du soir à imprimer. À offrir en échange de l’inscription à ma newsletter.",
    options: { formatId: "doc-guide", universe: "organisation", images: "ai" },
  },
  {
    label: "Client moodboard & shopping list",
    prompt: "Un document pour Claire et Thomas : moodboard de leur salon (lumineux, lin, chêne clair, touches de terracotta et d’olive), puis la shopping list : canapé en lin Kave Home 1 290 €, lampadaire en rotin Maisons du Monde 189 €, tapis en jute La Redoute 240 €, rideaux en lin lavé à compléter. Terminer par mes conseils d’agencement et la suite (un aller-retour de modifications).",
    options: { formatId: "doc-client", universe: "decoration", images: "auto" },
  },
  {
    label: "Offer sheet for Décoration",
    prompt: "Une fiche des offres Décoration : Déco Express 100 € (une pièce, conseils en visio d’une heure), Room Makeover 350 € (moodboard, palette, mobilier, shopping list, un aller-retour, à distance), Projet Déco Paris à partir de 1 500 € (accompagnement complet à Paris). Avec la mention TVA.",
    options: { formatId: "doc-offer", universe: "decoration", images: "none" },
  },
  {
    label: "Proposal for a company",
    prompt: "Une proposition pour la société Lumen (DRH : Sophie Martin) : atelier Home & Life Balance d’1 h 30 pour 20 collaborateurs parents, sur place à Paris. Contexte : retour de congé parental et charge mentale. Chiffres : +60 % des femmes avec un enfant de moins de 15 ans déclarent une charge mentale lourde (INED, 2026) ; 42 % placent l’équilibre des temps de vie en tête des raisons de rester (Randstad Workmonitor, 2026). Programme en 4 temps, The Home Balance Toolkit offert, tarif sur devis.",
    options: { formatId: "doc-proposal", universe: "entreprises", images: "none" },
  },
];

const PHOTO_CHOICES: { id: CreateOptions["images"]; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Your photos when one fits, otherwise generated, or none" },
  { id: "library", label: "My photos", hint: "Only images from the library" },
  { id: "ai", label: "Generate", hint: "New photos made by Flux 2" },
  { id: "none", label: "No photos", hint: "Text-only templates" },
];

const STEPS = ["Reading your prompt", "Choosing the templates", "Writing the slides in Rebeca’s voice", "Writing the caption", "Describing the photos", "Almost there"];

type SettingsResponse = { settings: { autoPhotos: boolean }; keys: { anthropic: boolean; replicate: boolean } };

export default function CreatePage() {
  const router = useRouter();
  const toast = useToast();
  const area = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [previous, setPrevious] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [options, setOptions] = useState<CreateOptions>({ formatId: "auto", universe: "auto", images: "auto", slides: null });
  const [improving, setImproving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recent, setRecent] = useState<Asset[]>([]);
  const [keys, setKeys] = useState<SettingsResponse["keys"] | null>(null);
  const [autoPhotos, setAutoPhotos] = useState(true);

  useEffect(() => {
    api<{ assets: Asset[] }>("/api/assets").then((d) => setRecent(d.assets.filter((a) => a.prompt).slice(0, 6)));
    api<SettingsResponse>("/api/settings").then((d) => {
      setKeys(d.keys);
      setAutoPhotos(d.settings.autoPhotos);
    });
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [busy]);

  const format = options.formatId === "auto" ? null : getFormat(options.formatId);
  // Documents come in portrait or landscape; choosing another document keeps the orientation.
  const landscape = Boolean(format && isDocument(format) && isLandscape(format));
  const set = (patch: Partial<CreateOptions>) => setOptions((o) => ({ ...o, ...patch }));
  const mayGenerate = options.images !== "none" && options.images !== "library";

  // Remembered for the next visual and for the changes asked in the editor.
  const toggleAutoPhotos = (v: boolean) => {
    setAutoPhotos(v);
    api("/api/settings", { method: "PUT", json: { autoPhotos: v } }).catch((e) => toast((e as Error).message, "error"));
  };

  const improve = async () => {
    setImproving(true);
    try {
      const out = await api<{ prompt: string; added: string[] }>("/api/prompt", { method: "POST", json: { prompt, options } });
      setPrevious(prompt);
      setPrompt(out.prompt);
      setAdded(out.added);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setImproving(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    setElapsed(0);
    try {
      const out = await api<{ asset: { id: string }; notes: string[]; photos: number; described: number }>("/api/create", { method: "POST", json: { prompt, options, autoPhotos } });
      if (out.photos) toast(`${out.photos} photo${out.photos > 1 ? "s are" : " is"} being generated: they appear in the slides in about 30 seconds.`, "success");
      else if (out.described && !autoPhotos) toast(`${out.described} photo${out.described > 1 ? "s" : ""} described, not generated: generate ${out.described > 1 ? "them" : "it"} from the photo slide${out.described > 1 ? "s" : ""} when you want.`, "success");
      router.push(`/assets/${out.asset.id}?created=1`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };

  const ready = prompt.trim().length >= 8 && keys?.anthropic !== false;

  return (
    <div className="mx-auto max-w-[1080px] px-10 py-12">
      <p className="eyebrow mb-3">Create</p>
      <h1 className="display mb-3 text-[60px]">
        Describe it, <em>the studio makes it.</em>
      </h1>
      <p className="mb-10 max-w-[640px] text-[15px] text-ink-soft">
        Write what you want in your own words, or paste your text. Claude writes the visual in Rebeca’s voice, the studio lays it out in the brand’s fonts and colours, and the photos are generated to match.
      </p>

      {keys?.anthropic === false && (
        <p className="mb-6 flex items-start gap-2 border border-blush bg-blush px-4 py-3 text-[13px] text-flag">
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          <span>
            Add ANTHROPIC_API_KEY to the .env file and restart the studio to create from a prompt. See <Link href="/settings" className="underline">Settings</Link>.
          </span>
        </p>
      )}

      <div className={`panel ${busy ? "opacity-60" : ""}`}>
        <textarea
          ref={area}
          className="block min-h-[170px] w-full resize-y bg-transparent px-6 pt-5 pb-3 font-display text-[21px] leading-[1.45] font-light text-ink outline-none placeholder:text-[#a59a90]"
          placeholder="Un carrousel LinkedIn pour les RH sur la charge mentale des parents salariés, avec deux chiffres de l’INED, un ton chaleureux, et une invitation à découvrir les ateliers Home & Life Balance…"
          value={prompt}
          disabled={busy}
          autoFocus
          onChange={(e) => {
            setPrompt(e.target.value);
            if (previous !== null && e.target.value !== prompt) setAdded([]);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready && !busy) generate();
          }}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <button className="btn btn-outline btn-sm" onClick={improve} disabled={improving || busy || prompt.trim().length < 8 || keys?.anthropic === false}>
            <Icon name="wand" size={14} /> {improving ? "Improving…" : "Improve my prompt"}
          </button>
          {previous !== null && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setPrompt(previous);
                setPrevious(null);
                setAdded([]);
              }}
            >
              Undo
            </button>
          )}
          <span className="ml-auto text-[11.5px] text-muted">⌘ Enter to generate</span>
        </div>
        {added.length > 0 && (
          <div className="anim-rise border-t border-line bg-cream px-6 py-3">
            <p className="eyebrow mb-1.5">What Claude added</p>
            <ul className="list-disc pl-4 text-[12.5px] text-ink-soft">
              {added.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-[12px] text-muted">Edit it freely before generating.</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-[1.3fr_1fr_1.4fr_0.7fr] gap-5">
        <div>
          <label className="label" htmlFor="opt-format">
            Format
          </label>
          <select
            id="opt-format"
            className="field"
            value={format?.landscapeOf ?? options.formatId}
            onChange={(e) => set({ formatId: e.target.value === "auto" ? "auto" : withOrientation(getFormat(e.target.value), landscape).id })}
            disabled={busy}
          >
            <option value="auto">Let Claude choose</option>
            {PLATFORMS.map((p) => (
              <optgroup key={p} label={p}>
                {FORMATS.filter((f) => f.platform === p).map((f) => (
                  <option key={f.id} value={f.id}>
                    {p === "Document" ? `${f.name} (A4 PDF)` : `${p} ${f.name.toLowerCase()}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {format && isDocument(format) && (
            <div className="mt-2.5">
              <OrientationChoice landscape={landscape} onChange={(l) => set({ formatId: withOrientation(format, l).id })} disabled={busy} />
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="opt-universe">
            Universe
          </label>
          <select id="opt-universe" className="field" value={options.universe} onChange={(e) => set({ universe: e.target.value })} disabled={busy}>
            <option value="auto">Let Claude choose</option>
            {UNIVERSES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.number} — {u.short}
              </option>
            ))}
            <option value="none">General</option>
          </select>
        </div>
        <div>
          <p className="label">Photos</p>
          <div className="flex flex-wrap gap-1.5">
            {PHOTO_CHOICES.map((c) => (
              <button key={c.id} className="chip" aria-pressed={options.images === c.id} onClick={() => set({ images: c.id })} title={c.hint} disabled={busy}>
                {c.label}
              </button>
            ))}
          </div>
          {mayGenerate && (
            <div className="mt-2.5">
              <Switch checked={autoPhotos} onChange={toggleAutoPhotos} disabled={busy}>
                Generate photos automatically
              </Switch>
              {!autoPhotos && <p className="mt-1 text-[11.5px] text-muted">Claude describes them; you generate each one from its slide.</p>}
            </div>
          )}
          {mayGenerate && autoPhotos && keys?.replicate === false && (
            <p className="mt-1.5 text-[11.5px] text-flag">No Replicate key: photo slides will wait for a photo.</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="opt-slides">
            {format?.shape === "a4" ? "Pages" : "Slides"}
          </label>
          <select
            id="opt-slides"
            className="field"
            value={options.slides ?? ""}
            onChange={(e) => set({ slides: e.target.value ? Number(e.target.value) : null })}
            disabled={busy || (format !== null && !format.multi)}
          >
            <option value="">Auto</option>
            {[3, 4, 5, 6, 7, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-6 border-t border-line pt-6">
        <p className="text-[12.5px] text-muted">
          About $0.05 for the text{!mayGenerate ? "" : autoPhotos ? ", plus $0.10 per generated photo (four at most)" : ". Photos are $0.10 each, only when you generate them"}. Every cost appears on the Costs page.
        </p>
        <button className="btn btn-solid h-12 px-7" disabled={!ready || busy} onClick={generate}>
          {busy ? "Creating…" : "Create the visual"} <Icon name="arrowRight" size={15} />
        </button>
      </div>

      {busy && (
        <div className="anim-rise mt-6 flex items-center gap-4 border-l-2 border-taupe-logo bg-paper px-5 py-4">
          <span className="anim-pulse font-display text-[19px] font-light">{STEPS[Math.min(STEPS.length - 1, Math.floor(elapsed / 7))]}…</span>
          <span className="ml-auto text-[12px] text-muted tabular-nums">{elapsed} s · usually 20 to 60 s</span>
        </div>
      )}

      {!busy && (
        <section className="mt-12">
          <p className="eyebrow mb-3">Try an example</p>
          <div className="grid grid-cols-2 gap-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                className="border border-line bg-paper/60 p-4 text-left transition-colors hover:border-rule hover:bg-paper"
                onClick={() => {
                  setPrompt(ex.prompt);
                  setPrevious(null);
                  setAdded([]);
                  setOptions((o) => ({ ...o, slides: null, ...ex.options }));
                  area.current?.focus();
                }}
              >
                <span className="block font-display text-[18px] font-light">{ex.label}</span>
                <span className="mt-1 line-clamp-2 block text-[12.5px] text-ink-soft">{ex.prompt}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!busy && recent.length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="eyebrow">Recent prompts</p>
            <Link href="/library" className="text-[12.5px] text-taupe underline underline-offset-4 hover:text-ink">
              All visuals
            </Link>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-3">
                <Link href={`/assets/${a.id}`}>
                  <AssetThumb asset={a} boxWidth={64} boxHeight={64} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/assets/${a.id}`} className="block truncate text-[14px] hover:underline">
                    {a.title}
                  </Link>
                  <p className="line-clamp-1 text-[12.5px] text-muted">{a.prompt}</p>
                </div>
                <span className="shrink-0 text-[12px] text-muted">{relativeTime(a.createdAt)}</span>
                <button
                  className="btn btn-ghost btn-sm shrink-0"
                  onClick={() => {
                    setPrompt(a.prompt ?? "");
                    setPrevious(null);
                    setAdded([]);
                    if (a.promptOptions) setOptions(a.promptOptions);
                    area.current?.focus();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Use again
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 text-[12.5px] text-muted">
        Prefer to write every text yourself?{" "}
        <Link href="/new" className="underline underline-offset-4 hover:text-ink">
          Start from a blank template
        </Link>
        .
      </p>
    </div>
  );
}

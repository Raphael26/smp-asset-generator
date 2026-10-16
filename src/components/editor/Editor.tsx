"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Job, Media } from "@/lib/db/schema";
import type { AssetContent, AssetOptions, LayoutId, Slide } from "@/lib/content";
import { makeId } from "@/lib/content";
import { formatLabel, getFormat, unitName, withOrientation } from "@/lib/brand/formats";
import { MAX_GALLERY, galleryFrame, imageFrame, newSlide } from "@/lib/brand/layouts";
import { lintContent, SEVERITY_ORDER, type Issue } from "@/lib/brand/lint";
import { api } from "@/components/ui/api";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toaster";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { ImagePicker } from "@/components/images/ImagePicker";
import { SlideRail } from "./SlideRail";
import { Stage } from "./Stage";
import { SlideInspector } from "./SlideInspector";
import { PostInspector } from "./PostInspector";
import { ImproveDialog } from "./ImproveDialog";
import { ReviewDialog } from "./ReviewDialog";
import { ExportDialog } from "./ExportDialog";
import { HistoryDialog } from "./HistoryDialog";
import { BrandCheckDialog } from "./BrandCheckDialog";
import { PromptBar } from "./PromptBar";
import { ChangeDialog, type Proposal } from "./ChangeDialog";

type Dialog = null | "improve" | "review" | "export" | "history" | "picker" | "check";
type SaveState = "saved" | "pending" | "saving" | "error";

export function Editor({ id, created = false }: { id: string; created?: boolean }) {
  const toast = useToast();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [missing, setMissing] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [current, setCurrentRaw] = useState(0);
  const [tab, setTab] = useState<"slide" | "post">("slide");
  const [dialog, setDialog] = useState<Dialog>(null);
  // The photo picker fills the slide's photo, or adds a photo to a moodboard.
  const [pickerTarget, setPickerTarget] = useState<"image" | "gallery">("image");
  const [save, setSave] = useState<SaveState>("saved");
  const [overflow, setOverflow] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState({ anthropic: true, replicate: true });
  const [autoPhotos, setAutoPhotos] = useState(true);
  const [proposal, setProposal] = useState<{ mode: "edit" | "regenerate"; data: Proposal; prompt: string } | null>(null);
  const [promptBusy, setPromptBusy] = useState<"edit" | "regenerate" | null>(null);
  const [showNotes, setShowNotes] = useState(created);

  // Autosave: every change bumps `version`; a save sends the latest asset and remembers which version it was.
  const latest = useRef<Asset | null>(null);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    api<{ asset: Asset }>(`/api/assets/${id}`)
      .then(({ asset }) => {
        latest.current = asset;
        setAsset(asset);
      })
      .catch(() => setMissing(true));
    api<{ media: Media[] }>("/api/media").then((d) => setMedia(d.media));
    api<{ settings: { autoPhotos: boolean }; keys: { anthropic: boolean; replicate: boolean } }>("/api/settings").then((d) => {
      setKeys(d.keys);
      setAutoPhotos(d.settings.autoPhotos);
    });
  }, [id]);

  const persist = useCallback(async () => {
    const a = latest.current;
    if (!a) return;
    const v = version.current;
    setSave("saving");
    try {
      await api(`/api/assets/${a.id}`, {
        method: "PUT",
        json: { title: a.title, formatId: a.formatId, universe: a.universe, status: a.status, content: a.content, notes: a.notes, publishedAt: a.publishedAt, publishedUrl: a.publishedUrl },
      });
      savedVersion.current = Math.max(savedVersion.current, v);
      setSave(version.current === savedVersion.current ? "saved" : "pending");
    } catch (e) {
      setSave("error");
      toast(`Not saved: ${(e as Error).message}`, "error");
    }
  }, [toast]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    if (version.current !== savedVersion.current) {
      inflight.current = persist();
      await inflight.current;
      inflight.current = null;
    }
  }, [persist]);

  const update = useCallback(
    (fn: (a: Asset) => Asset) => {
      const base = latest.current;
      if (!base) return;
      const next = fn(base);
      latest.current = next;
      setAsset(next);
      version.current++;
      setSave("pending");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        inflight.current = persist().finally(() => (inflight.current = null));
      }, 700);
    },
    [persist],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      // Leaving the editor inside the app: save what is pending (the refs are read on purpose at that moment).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (version.current !== savedVersion.current) persist();
    };
  }, [persist]);

  const total = asset?.content.slides.length ?? 0;
  const setCurrent = useCallback((i: number) => setCurrentRaw(Math.max(0, Math.min(i, total - 1))), [total]);

  // ← → move between slides when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (dialog || /input|textarea|select/i.test(t.tagName) || t.isContentEditable) return;
      if (e.key === "ArrowLeft") setCurrent(current - 1);
      if (e.key === "ArrowRight") setCurrent(current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, dialog, setCurrent]);

  const aiIds = useMemo(() => new Set(media.filter((m) => m.isAi).map((m) => m.id)), [media]);
  const issues = useMemo<Issue[]>(() => {
    if (!asset) return [];
    const list = lintContent(asset.content, { aiMediaIds: aiIds });
    asset.content.slides.forEach((s, i) => {
      if (overflow[s.id]) list.unshift({ severity: "error", slide: i, field: null, message: "The text doesn’t fit, even with smaller type: shorten it." });
    });
    return list.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [asset, aiIds, overflow]);

  const onFit = useCallback((slideId: string, over: boolean) => setOverflow((o) => (o[slideId] === over ? o : { ...o, [slideId]: over })), []);

  // Photos being generated for slides: poll Replicate through the API and drop each photo in its slide.
  const pendingKey = (asset?.content.slides ?? [])
    .flatMap((s) => [s.photoJob, ...(s.gallery ?? []).map((g) => g.photoJob)])
    .filter((j): j is string => Boolean(j))
    .join(",");
  useEffect(() => {
    if (!pendingKey) return;
    let stop = false;
    const tick = async () => {
      try {
        const { jobs } = await api<{ jobs: Job[] }>(`/api/jobs?ids=${pendingKey}`);
        if (stop) return;
        const done = jobs.filter((j) => j.status !== "running");
        if (!done.length) return;
        update((a) => ({
          ...a,
          content: {
            ...a.content,
            slides: a.content.slides.map((s) => {
              const photo = (j: Job) => (j.status === "succeeded" && j.mediaId ? { mediaId: j.mediaId, focusX: 50, focusY: 40, zoom: 1 } : null);
              let next = s;
              const j = done.find((x) => x.id === s.photoJob);
              if (j) next = { ...next, photoJob: null, image: photo(j) ?? s.image };
              if (s.gallery?.some((g) => done.some((x) => x.id === g.photoJob))) {
                next = {
                  ...next,
                  gallery: s.gallery.map((g) => {
                    const gj = done.find((x) => x.id === g.photoJob);
                    return gj ? { ...g, photoJob: null, image: photo(gj) ?? g.image } : g;
                  }),
                };
              }
              return next;
            }),
          },
        }));
        if (done.some((j) => j.status === "succeeded")) api<{ media: Media[] }>("/api/media").then((d) => setMedia(d.media));
        for (const j of done) if (j.status !== "succeeded") toast(`A photo could not be generated: ${j.error ?? "unknown error"}`, "error");
      } catch (e) {
        if (!stop) toast((e as Error).message, "error");
      }
    };
    const t = setInterval(tick, 3000);
    tick();
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [pendingKey, update, toast]);

  if (missing)
    return (
      <div className="p-16">
        <h1 className="display text-[40px]">This asset doesn’t exist any more.</h1>
        <Link href="/library" className="btn btn-outline mt-6">
          Back to the library
        </Link>
      </div>
    );
  if (!asset) return <p className="p-16 text-taupe">Loading…</p>;

  const format = getFormat(asset.formatId);
  const slide = asset.content.slides[Math.min(current, total - 1)];
  const setContent = (fn: (c: AssetContent) => AssetContent) => update((a) => ({ ...a, content: fn(a.content) }));
  const setSlides = (fn: (s: Slide[]) => Slide[]) => setContent((c) => ({ ...c, slides: fn(c.slides) }));
  const setOptions = (o: Partial<AssetOptions>) => setContent((c) => ({ ...c, options: { ...c.options, ...o } }));

  const addSlide = (layout: LayoutId) => {
    setSlides((s) => [...s.slice(0, current + 1), newSlide(layout), ...s.slice(current + 1)]);
    setCurrentRaw(current + 1);
    setTab("slide");
  };
  const moveSlide = (i: number, dir: -1 | 1) => {
    setSlides((s) => {
      const n = [...s];
      [n[i], n[i + dir]] = [n[i + dir], n[i]];
      return n;
    });
    if (current === i) setCurrentRaw(i + dir);
  };
  const duplicateSlide = (i: number) => {
    setSlides((s) => [...s.slice(0, i + 1), { ...structuredClone(s[i]), id: makeId() }, ...s.slice(i + 1)]);
    setCurrentRaw(i + 1);
  };
  const deleteSlide = (i: number) => {
    const s = asset.content.slides[i];
    const hasText = Object.values(s.fields).some((v) => v.trim()) || s.image;
    if (hasText && !confirm(`Delete ${unitName(format)} ${i + 1}? You can get it back from the history after the next save.`)) return;
    setSlides((all) => all.filter((_, j) => j !== i));
    setCurrentRaw(Math.max(0, Math.min(current, total - 2)));
  };

  const startPhotos = async (items: { slideId: string; prompt: string; galleryIndex?: number }[]) => {
    if (!items.length) return;
    if (!keys.replicate) {
      toast("Add REPLICATE_API_TOKEN to .env to generate photos. The photo prompts are kept on the slides.", "error");
      return;
    }
    try {
      await flush();
      const { jobs } = await api<{ jobs: { slideId: string; jobId: string; prompt: string; galleryIndex?: number }[] }>(`/api/assets/${asset.id}/photos`, { method: "POST", json: { items } });
      setSlides((all) =>
        all.map((s) => {
          let next = s;
          for (const j of jobs.filter((x) => x.slideId === s.id)) {
            if (j.galleryIndex === undefined) next = { ...next, photoJob: j.jobId, photoPrompt: j.prompt };
            else {
              const gallery = [...(next.gallery ?? [])];
              while (gallery.length <= j.galleryIndex) gallery.push({ image: null });
              gallery[j.galleryIndex] = { ...gallery[j.galleryIndex], photoJob: j.jobId, photoPrompt: j.prompt };
              next = { ...next, gallery };
            }
          }
          return next;
        }),
      );
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const askClaude = async (mode: "edit" | "regenerate", text: string): Promise<boolean> => {
    setPromptBusy(mode);
    try {
      await flush();
      const data = await api<Proposal>(`/api/assets/${asset.id}/ai`, { method: "POST", json: mode === "edit" ? { action: "edit", instruction: text } : { action: "regenerate", prompt: text } });
      setProposal({ mode, data, prompt: text });
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setPromptBusy(null);
    }
  };

  const applyProposal = async (generatePhotos: boolean) => {
    if (!proposal) return;
    const { mode, data, prompt } = proposal;
    await flush();
    await api(`/api/assets/${asset.id}/revisions`, { method: "POST", json: { reason: mode === "edit" ? "Before a change asked to Claude" : "Before regenerating from the prompt" } });
    // The format changes only when Claude turned a document to the other orientation, as she asked.
    update((a) => ({ ...a, formatId: data.formatId, content: data.content, ...(mode === "regenerate" ? { prompt } : {}) }));
    setProposal(null);
    if (mode === "regenerate") setCurrentRaw(0);
    else setCurrentRaw((c) => Math.min(c, data.content.slides.length - 1));
    await flush();
    if (generatePhotos && keys.replicate) await startPhotos(data.generate);
    toast("Applied. The previous version is in the history.", "success");
  };

  const goToIssue = (i: Issue) => {
    if (i.slide === null) {
      setTab("post");
      setTimeout(() => document.getElementById("caption")?.focus(), 50);
      return;
    }
    setCurrentRaw(i.slide);
    setTab("slide");
    if (i.field) setTimeout(() => document.getElementById(`field-${i.slide}-${i.field}`)?.focus(), 80);
  };

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-line bg-paper px-5">
        <Link href="/library" className="btn btn-ghost btn-sm -ml-2" title="Back to the library">
          <Icon name="arrowLeft" size={15} />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-display text-[20px] leading-tight font-light">{asset.title}</p>
          <p className="text-[11.5px] text-muted">
            {formatLabel(format)} ·{" "}
            <span className={save === "error" ? "text-flag" : ""}>{save === "saved" ? "Saved" : save === "saving" ? "Saving…" : save === "pending" ? "Editing…" : "Not saved"}</span>
          </p>
        </div>
        <StatusBadge status={asset.status} />
        <div className="ml-auto flex items-center gap-1.5">
          <button
            className={`btn btn-sm ${errors ? "border-blush bg-blush text-flag" : "btn-ghost"}`}
            onClick={() => setDialog("check")}
            title="Brand check"
          >
            <Icon name={errors ? "alert" : "check"} size={14} />
            {errors ? `${errors} to fix` : warnings ? `${warnings} to check` : "On brand"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setDialog("history")}>
            <Icon name="history" size={14} /> History
          </button>
          <span className="mx-1 h-6 w-px bg-line" />
          <button className="btn btn-outline btn-sm" disabled={!keys.anthropic} title={keys.anthropic ? "" : "Add ANTHROPIC_API_KEY to .env"} onClick={() => setDialog("review")}>
            <Icon name="eye" size={14} /> Review
          </button>
          <button className="btn btn-outline btn-sm" disabled={!keys.anthropic} title={keys.anthropic ? "" : "Add ANTHROPIC_API_KEY to .env"} onClick={() => setDialog("improve")}>
            <Icon name="wand" size={14} /> Improve with Claude
          </button>
          <button className="btn btn-solid btn-sm" onClick={() => setDialog("export")}>
            <Icon name="download" size={14} /> Export
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {format.multi && (
          <SlideRail
            asset={asset}
            current={current}
            setCurrent={setCurrentRaw}
            onAdd={addSlide}
            onMove={moveSlide}
            onDuplicate={duplicateSlide}
            onDelete={deleteSlide}
            onFit={onFit}
            issueCount={(i) => issues.filter((x) => x.slide === i && x.severity === "error").length}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {showNotes && asset.notes.trim() && (
            <div className="anim-rise flex shrink-0 items-start gap-3 border-b border-line bg-cream px-6 py-3 text-[12.5px] text-ink-soft">
              <Icon name="wand" size={15} className="mt-0.5 shrink-0 text-taupe-logo" />
              <div className="flex-1">
                <p className="mb-0.5 font-medium text-ink">Made from your prompt. Claude’s notes:</p>
                <p className="whitespace-pre-line">{asset.notes}</p>
              </div>
              <button className="text-taupe hover:text-ink" onClick={() => setShowNotes(false)} aria-label="Dismiss">
                <Icon name="close" size={14} />
              </button>
            </div>
          )}
          <Stage
            asset={asset}
            current={current}
            setCurrent={setCurrent}
            issues={issues}
            onFit={onFit}
            onIssue={goToIssue}
            onOrientation={(l) => update((a) => ({ ...a, formatId: withOrientation(getFormat(a.formatId), l).id }))}
          />
          <PromptBar
            key={asset.prompt ?? "none"}
            prompt={asset.prompt}
            busy={promptBusy}
            disabled={!keys.anthropic}
            current={current}
            multi={format.multi}
            unit={unitName(format)}
            onAsk={(t) => askClaude("edit", t)}
            onRegenerate={(t) => askClaude("regenerate", t)}
          />
        </div>
        <aside className="flex w-[400px] shrink-0 flex-col border-l border-line bg-paper">
          <div className="flex shrink-0 gap-6 border-b border-line px-6">
            {(
              [
                ["slide", format.multi ? `${unitName(format) === "page" ? "Page" : "Slide"} ${current + 1}` : "Visual"],
                ["post", "Post"],
              ] as const
            ).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 py-3.5 text-[13.5px] ${tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6">
            {tab === "slide" && slide ? (
              <SlideInspector
                key={slide.id}
                slide={slide}
                index={current}
                media={media}
                onChange={(s) => setSlides((all) => all.map((x) => (x.id === s.id ? s : x)))}
                onPickImage={() => {
                  setPickerTarget("image");
                  setDialog("picker");
                }}
                onNewPhoto={(prompt) => startPhotos([{ slideId: slide.id, prompt }])}
                format={format}
                onPickGallery={() => {
                  setPickerTarget("gallery");
                  setDialog("picker");
                }}
                onNewGalleryPhoto={(galleryIndex, prompt) => startPhotos([{ slideId: slide.id, prompt, galleryIndex }])}
              />
            ) : (
              <PostInspector
                asset={asset}
                onChange={(patch) => update((a) => ({ ...a, ...patch }))}
                onOptions={setOptions}
                claudeReady={keys.anthropic}
                askCaption={async (mode, instruction) => {
                  try {
                    await flush();
                    return await api<{ caption: string; notes: string[] }>(`/api/assets/${asset.id}/ai`, { method: "POST", json: { action: "caption", mode, instruction } });
                  } catch (e) {
                    toast((e as Error).message, "error");
                    return null;
                  }
                }}
              />
            )}
          </div>
        </aside>
      </div>

      <ImagePicker
        open={dialog === "picker"}
        onClose={() => setDialog(null)}
        media={media}
        setMedia={(fn) => setMedia(fn)}
        frame={slide ? (pickerTarget === "gallery" ? galleryFrame() : imageFrame(slide.layout, format)) : null}
        assetId={asset.id}
        currentId={pickerTarget === "gallery" ? null : (slide?.image?.mediaId ?? null)}
        initialPrompt={pickerTarget === "gallery" ? null : (slide?.photoPrompt ?? null)}
        onPick={(mediaId) =>
          slide &&
          setSlides((all) =>
            all.map((x) =>
              x.id !== slide.id
                ? x
                : pickerTarget === "gallery"
                  ? { ...x, gallery: [...(x.gallery ?? []), { image: { mediaId, focusX: 50, focusY: 50, zoom: 1 } }].slice(0, MAX_GALLERY) }
                  : { ...x, image: { mediaId, focusX: 50, focusY: 40, zoom: 1 } },
            ),
          )
        }
      />
      {dialog === "improve" && (
      <ImproveDialog
        open
        onClose={() => setDialog(null)}
        asset={asset}
        current={current}
        flush={flush}
        onApply={async (content) => {
          update((a) => ({ ...a, content }));
          await flush();
          toast("Changes applied. The previous text is in the history.", "success");
        }}
      />
      )}
      {dialog === "review" && (
      <ReviewDialog
        open
        onClose={() => setDialog(null)}
        asset={asset}
        flush={flush}
        onUse={(slideIndex, field, value) => {
          if (slideIndex === null) setContent((c) => ({ ...c, caption: value }));
          else setSlides((all) => all.map((x, j) => (j === slideIndex ? { ...x, fields: { ...x.fields, [field]: value } } : x)));
        }}
      />
      )}
      {dialog === "export" && (
      <ExportDialog
        open
        onClose={() => setDialog(null)}
        asset={asset}
        current={current}
        flush={flush}
        errors={errors}
        onMarkPublished={() => {
          update((a) => ({ ...a, status: "published", publishedAt: a.publishedAt ?? new Date().toISOString().slice(0, 10) }));
          setTab("post");
        }}
      />
      )}
      {dialog === "history" && (
      <HistoryDialog
        open
        onClose={() => setDialog(null)}
        asset={asset}
        flush={flush}
        onRestored={(a) => {
          latest.current = a;
          version.current++;
          savedVersion.current = version.current;
          setAsset(a);
          setSave("saved");
          setCurrentRaw(0);
        }}
      />
      )}
      {proposal && (
        <ChangeDialog open asset={asset} proposal={proposal.data} mode={proposal.mode} photosEnabled={keys.replicate} autoPhotos={autoPhotos} onClose={() => setProposal(null)} onApply={applyProposal} />
      )}
      <BrandCheckDialog open={dialog === "check"} onClose={() => setDialog(null)} asset={asset} issues={issues} onGo={goToIssue} />
    </div>
  );
}

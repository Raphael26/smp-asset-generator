"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

const IDEAS = ["Raccourcis tous les textes", "Ajoute un slide avec un conseil pratique", "Un ton plus professionnel, pour des RH", "Une autre photo pour ce slide, plus lumineuse"];

/** Under the preview: ask for a change in plain words, or go back to the original prompt. */
export function PromptBar({
  prompt,
  busy,
  disabled,
  current,
  multi,
  onAsk,
  onRegenerate,
}: {
  prompt: string | null;
  busy: "edit" | "regenerate" | null;
  disabled: boolean;
  current: number;
  multi: boolean;
  onAsk: (instruction: string) => Promise<boolean>;
  onRegenerate: (prompt: string) => void;
}) {
  const [text, setText] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [draft, setDraft] = useState(prompt ?? "");

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    // « ce slide » means the one on screen.
    const instruction = multi ? `${t}\n(Le slide affiché est le slide ${current + 1}.)` : t;
    if (await onAsk(instruction)) setText("");
  };

  return (
    <div className="shrink-0 border-t border-line bg-paper px-5 py-3">
      {showPrompt && (
        <div className="anim-rise mb-3 border border-line bg-cream p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">{prompt ? "The prompt this visual was made from" : "Make this visual again from a prompt"}</p>
            <button className="text-taupe hover:text-ink" onClick={() => setShowPrompt(false)} aria-label="Close">
              <Icon name="close" size={14} />
            </button>
          </div>
          <textarea className="field text-[13.5px]" rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe the visual you want…" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-muted">Rewrites every slide; the current version stays in the history.</p>
            <button className="btn btn-outline btn-sm" disabled={disabled || busy !== null || draft.trim().length < 8} onClick={() => onRegenerate(draft)}>
              {busy === "regenerate" ? "Claude is writing…" : "Regenerate from this prompt"}
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button className={`btn btn-sm shrink-0 ${showPrompt ? "btn-outline" : "btn-ghost"}`} onClick={() => setShowPrompt((s) => !s)} title="Show the prompt">
          <Icon name="text" size={14} /> Prompt
        </button>
        <div className="relative flex-1">
          <Icon name="wand" size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-taupe-logo" />
          <input
            className="field h-11 pr-28 pl-9 text-[14px]"
            placeholder={disabled ? "Add the Anthropic key in .env to ask Claude for changes" : multi ? `Ask for a change: « raccourcis ce slide », « ajoute un slide sur les routines du matin »…` : "Ask for a change: « un titre plus court », « une autre photo »…"}
            value={text}
            disabled={disabled || busy !== null}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            list="prompt-ideas"
          />
          <datalist id="prompt-ideas">
            {IDEAS.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
          <button className="btn btn-solid btn-sm absolute top-1.5 right-1.5 h-8" disabled={disabled || busy !== null || !text.trim()} onClick={send}>
            {busy === "edit" ? "Working…" : "Ask"}
            {busy !== "edit" && <Icon name="send" size={13} />}
          </button>
        </div>
      </div>
      {busy && <p className="anim-pulse mt-2 text-[12px] text-taupe">Claude is {busy === "edit" ? "making the change" : "rewriting the visual"}… 20 to 60 seconds.</p>}
    </div>
  );
}

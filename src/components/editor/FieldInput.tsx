"use client";

import { useRef } from "react";
import type { FieldDef } from "@/lib/brand/layouts";
import { plainText } from "@/lib/brand/typography";

/** One template field: a line or a text area, a character counter, and italic / bold buttons. */
export function FieldInput({ def, value, onChange, id }: { def: FieldDef; value: string; onChange: (v: string) => void; id: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const plain = plainText(value);
  const counted = def.kind === "list" || def.kind === "table";
  const count = counted ? plain.split("\n").filter((l) => l.trim()).length : plain.length;
  const over = count > def.max;

  // Wraps the selection in * or ** (or removes them if already there).
  const wrap = (mark: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    if (a === b) return el.focus();
    const before = value.slice(0, a);
    const sel = value.slice(a, b);
    const after = value.slice(b);
    let next: string;
    let selStart = a;
    let selEnd = b;
    if (before.endsWith(mark) && after.startsWith(mark)) {
      next = before.slice(0, -mark.length) + sel + after.slice(mark.length);
      selStart -= mark.length;
      selEnd -= mark.length;
    } else {
      next = before + mark + sel + mark + after;
      selStart += mark.length;
      selEnd += mark.length;
    }
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const lines = Math.max(def.kind === "title" ? 2 : def.kind === "line" ? 1 : def.kind === "rich" || def.kind === "table" ? 6 : 3, value.split("\n").length + (def.kind === "text" || def.kind === "rich" ? 1 : 0));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="label mb-0" htmlFor={id}>
          {def.label}
          {def.optional && <span className="ml-1.5 font-normal tracking-normal normal-case text-muted">optional</span>}
        </label>
        <span className={`text-[11px] tabular-nums ${over ? "font-semibold text-flag" : "text-muted"}`}>
          {count}/{def.max}
          {def.kind === "list" ? " items" : def.kind === "table" ? " rows" : ""}
        </span>
      </div>
      {def.kind === "line" ? (
        <input id={id} className="field" value={value} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="relative">
          <textarea
            id={id}
            ref={ref}
            style={{ minHeight: 0 }}
            rows={Math.min(lines, def.kind === "rich" || def.kind === "table" ? 18 : 9)}
            className={`field block ${def.kind === "table" ? "font-mono text-[12.5px]" : ""}`}
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
                e.preventDefault();
                wrap("*");
              }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && (def.kind === "text" || def.kind === "rich")) {
                e.preventDefault();
                wrap("**");
              }
            }}
          />
          {def.kind !== "list" && def.kind !== "table" && (
            <div className="mt-1 flex gap-1">
              <button type="button" className="btn btn-ghost btn-sm h-6 px-2 font-display text-[13px] tracking-normal normal-case italic" onClick={() => wrap("*")} title="Italic (⌘I): select words first">
                Italic
              </button>
              {(def.kind === "text" || def.kind === "rich") && (
                <button type="button" className="btn btn-ghost btn-sm h-6 px-2 text-[12px] font-semibold tracking-normal normal-case" onClick={() => wrap("**")} title="Bold (⌘B): select words first">
                  Bold
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {def.help && <p className="mt-1 text-[11.5px] leading-snug text-muted">{def.help}</p>}
    </div>
  );
}

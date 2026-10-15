"use client";

import type { ReactNode } from "react";

/** An on/off switch with its label; the whole row is clickable. */
export function Switch({ checked, onChange, disabled, children }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-left text-[12.5px] text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={`relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full transition-colors ${checked ? "bg-ink" : "bg-rule"}`}>
        <span className={`absolute left-[2px] h-[14px] w-[14px] rounded-full bg-paper transition-transform ${checked ? "translate-x-[14px]" : ""}`} />
      </span>
      {children}
    </button>
  );
}

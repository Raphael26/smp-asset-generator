"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = 720,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        className="anim-rise relative flex max-h-[92vh] w-full flex-col border border-line bg-paper shadow-[0_24px_60px_-20px_rgba(48,43,39,.35)]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 pt-6 pb-5">
          <div>
            {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
            <h2 className="display text-[30px]">{title}</h2>
          </div>
          <button className="btn btn-ghost btn-icon -mr-2" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-7 py-6">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-line px-7 py-4">{footer}</div>}
      </div>
    </div>
  );
}

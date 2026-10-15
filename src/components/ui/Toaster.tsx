"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type Toast = { id: number; message: string; tone: "info" | "error" | "success" };
type ToastFn = (message: string, tone?: Toast["tone"]) => void;

const Ctx = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback<ToastFn>((message, tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 9000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-[60] flex w-[380px] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 border px-4 py-3 text-[13.5px] leading-snug shadow-[0_12px_30px_-14px_rgba(48,43,39,.4)] ${
              t.tone === "error" ? "border-blush bg-blush text-flag" : "border-line bg-paper text-ink"
            }`}
          >
            <Icon name={t.tone === "error" ? "alert" : t.tone === "success" ? "check" : "info"} size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="text-taupe hover:text-ink">
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

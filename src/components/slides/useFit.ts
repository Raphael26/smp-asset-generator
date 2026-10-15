"use client";

import { useLayoutEffect, type RefObject } from "react";

const MIN_FIT = 0.62;

/**
 * Shrinks the type (the --fit CSS variable) until the body fits, once the fonts are ready, and
 * reports whether it still overflows. Runs again whenever `key` changes. The export waits for
 * data-ready="true" on the slide before capturing it.
 */
export function useFit(
  ref: RefObject<HTMLDivElement | null>,
  bodyRef: RefObject<HTMLDivElement | null>,
  key: string,
  onFit?: (result: { fit: number; overflow: boolean }) => void,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    const body = bodyRef.current;
    if (!el || !body) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      let fit = 1;
      el.style.setProperty("--fit", "1");
      const overflows = () => body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
      while (overflows() && fit > MIN_FIT) {
        fit = Math.max(MIN_FIT, +(fit - 0.03).toFixed(2));
        el.style.setProperty("--fit", String(fit));
      }
      const overflow = overflows();
      el.dataset.fit = String(fit);
      el.dataset.overflow = String(overflow);
      el.dataset.ready = "true";
      onFit?.({ fit, overflow });
    };
    el.dataset.ready = "false";
    run();
    document.fonts.ready.then(run);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

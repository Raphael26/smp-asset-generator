"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/db/schema";
import { api } from "@/components/ui/api";

/** Polls Replicate jobs until they finish; calls onDone once per finished job. */
export function useJobs(onDone: (job: Job) => void, onError?: (message: string) => void) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const done = useRef(new Set<string>());
  const cb = useRef({ onDone, onError });
  useEffect(() => {
    cb.current = { onDone, onError };
  });

  const running = jobs.filter((j) => j.status === "running").map((j) => j.id);
  const key = running.join(",");

  useEffect(() => {
    if (!key) return;
    let stop = false;
    const tick = async () => {
      try {
        const { jobs: fresh } = await api<{ jobs: Job[] }>(`/api/jobs?ids=${key}`);
        if (stop) return;
        setJobs((prev) => prev.map((j) => fresh.find((f) => f.id === j.id) ?? j));
        for (const j of fresh) {
          if (j.status !== "running" && !done.current.has(j.id)) {
            done.current.add(j.id);
            if (j.status === "succeeded") cb.current.onDone(j);
            else cb.current.onError?.(j.error ?? "The image could not be made.");
          }
        }
      } catch (e) {
        cb.current.onError?.((e as Error).message);
      }
    };
    const t = setInterval(tick, 2500);
    tick();
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [key]);

  const add = useCallback((js: Job[]) => setJobs((prev) => [...js, ...prev]), []);
  const clear = useCallback(() => setJobs((prev) => prev.filter((j) => j.status === "running")), []);
  return { jobs, add, clear, busy: running.length > 0 };
}

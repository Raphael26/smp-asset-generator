"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CostEvent } from "@/lib/db/schema";
import type { PriceRule } from "@/lib/ai/pricing";
import { api, usd } from "@/components/ui/api";
import { useToast } from "@/components/ui/Toaster";

const OPS: Record<string, string> = {
  compose: "Visuals from a prompt",
  edit: "Changes from a prompt",
  image: "Image generation",
  upscale: "Sharpening (Topaz)",
  improve: "Text improvement",
  caption: "Captions",
  prompt: "Prompts (photo or brief)",
  review: "Brand reviews",
};
const PROVIDERS: Record<string, string> = { replicate: "Replicate · images", anthropic: "Anthropic · Claude" };

type Group = { key: string; count: number; costUsd: number };
type Summary = {
  totalUsd: number;
  monthUsd: number;
  monthCount: number;
  byProvider: Group[];
  byOperation: Group[];
  byModel: Group[];
  byAsset: Group[];
  months: { month: string; costUsd: number; replicate: number; anthropic: number }[];
  recent: CostEvent[];
  budgetUsd: number;
  prices: Record<string, PriceRule>;
  customised: string[];
  assetTitles: Record<string, string>;
};

const monthName = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString("en-GB", { month: "short" });

function quantity(e: CostEvent) {
  const q = e.quantity;
  if (e.provider === "anthropic") {
    const input = (q.inputTokens ?? 0) + (q.cacheReadTokens ?? 0) + (q.cacheWriteTokens ?? 0);
    return `${input.toLocaleString("en-US")} in · ${(q.outputTokens ?? 0).toLocaleString("en-US")} out${q.cacheReadTokens ? " · cached" : ""}`;
  }
  return `${q.images ?? 1} image · ${(q.megapixels ?? 0).toFixed(1)} MP`;
}

function Bars({ groups, label }: { groups: Group[]; label: (k: string) => string }) {
  const max = Math.max(...groups.map((g) => g.costUsd), 0.0001);
  if (!groups.length) return <p className="text-[13px] text-muted">Nothing this month.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {groups.map((g) => (
        <li key={g.key}>
          <div className="mb-1 flex justify-between gap-3 text-[13px]">
            <span className="text-ink-soft">
              {label(g.key)} <span className="text-muted">· {g.count}</span>
            </span>
            <span className="tabular-nums">{usd(g.costUsd)}</span>
          </div>
          <div className="h-[3px] bg-stone">
            <div className="h-full bg-taupe-logo" style={{ width: `${(g.costUsd / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function CostsPage() {
  const toast = useToast();
  const [s, setS] = useState<Summary | null>(null);
  const [budget, setBudget] = useState("");
  const [editing, setEditing] = useState<Record<string, PriceRule>>({});

  const load = () =>
    api<Summary>("/api/costs").then((d) => {
      setS(d);
      setBudget(String(d.budgetUsd));
    });
  useEffect(() => {
    load();
  }, []);

  if (!s) return <p className="p-16 text-taupe">Loading…</p>;

  const pct = s.budgetUsd > 0 ? (s.monthUsd / s.budgetUsd) * 100 : 0;
  const maxMonth = Math.max(...s.months.map((m) => m.costUsd), 0.0001);

  const saveBudget = async () => {
    await api("/api/settings", { method: "PUT", json: { monthlyBudgetUsd: Number(budget) || 0 } });
    toast("Budget saved.", "success");
    load();
  };
  const savePrices = async () => {
    const custom: Record<string, PriceRule> = {};
    for (const k of s.customised) custom[k] = s.prices[k];
    await api("/api/settings", { method: "PUT", json: { prices: { ...custom, ...editing } } });
    setEditing({});
    toast("Prices saved. They apply to new costs only.", "success");
    load();
  };
  const resetPrices = async () => {
    await api("/api/settings", { method: "PUT", json: { prices: {} } });
    setEditing({});
    load();
  };

  const priceField = (model: string, key: string, value: number) => (
    <input
      type="number"
      step="0.001"
      min="0"
      className="field h-8 w-[84px] px-2 py-1 text-right text-[13px] tabular-nums"
      value={(editing[model] as Record<string, unknown> | undefined)?.[key] as number ?? value}
      onChange={(e) => setEditing((ed) => ({ ...ed, [model]: { ...(ed[model] ?? s.prices[model]), [key]: Number(e.target.value) } as PriceRule }))}
    />
  );

  return (
    <div className="mx-auto max-w-[1180px] px-10 py-12">
      <p className="eyebrow mb-3">Costs</p>
      <h1 className="display mb-10 text-[56px]">
        What it costs, <em>to the cent.</em>
      </h1>

      <div className="mb-12 grid grid-cols-3 gap-6">
        <div className="panel p-7">
          <p className="eyebrow mb-3">This month</p>
          <p className="font-display text-[62px] leading-none font-light text-taupe-logo">{usd(s.monthUsd)}</p>
          <p className="mt-3 text-[13px] text-ink-soft">
            {s.monthCount} paid request{s.monthCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="panel p-7">
          <p className="eyebrow mb-3">Monthly budget</p>
          <div className="mb-3 h-[6px] bg-stone">
            <div className={`h-full ${pct >= 90 ? "bg-flag" : "bg-taupe-logo"}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <p className="mb-4 text-[13px] text-ink-soft">{s.budgetUsd > 0 ? `${Math.round(pct)} % used · ${usd(Math.max(0, s.budgetUsd - s.monthUsd))} left` : "No budget set."}</p>
          <div className="flex items-center gap-2">
            <span className="text-taupe">$</span>
            <input className="field h-9 w-24 py-1" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <button className="btn btn-outline btn-sm" onClick={saveBudget} disabled={Number(budget) === s.budgetUsd}>
              Save
            </button>
          </div>
        </div>
        <div className="panel p-7">
          <p className="eyebrow mb-3">Since the start</p>
          <p className="font-display text-[44px] leading-none font-light">{usd(s.totalUsd)}</p>
          <div className="mt-5 flex h-[70px] items-end gap-2">
            {s.months.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${m.month}: ${usd(m.costUsd)}`}>
                <div className="flex w-full flex-col justify-end" style={{ height: 52 }}>
                  <div className="w-full bg-taupe-logo" style={{ height: `${(m.replicate / maxMonth) * 52}px` }} />
                  <div className="w-full bg-rule" style={{ height: `${(m.anthropic / maxMonth) * 52}px` }} />
                </div>
                <span className="text-[10.5px] text-muted">{monthName(m.month)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-taupe-logo" /> Images
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-rule" /> Claude
            </span>
          </p>
        </div>
      </div>

      <div className="mb-12 grid grid-cols-3 gap-10">
        <section>
          <h2 className="mb-4 font-display text-[22px] font-light">By service</h2>
          <Bars groups={s.byProvider} label={(k) => PROVIDERS[k] ?? k} />
        </section>
        <section>
          <h2 className="mb-4 font-display text-[22px] font-light">By task</h2>
          <Bars groups={s.byOperation} label={(k) => OPS[k] ?? k} />
        </section>
        <section>
          <h2 className="mb-4 font-display text-[22px] font-light">Most expensive assets</h2>
          {s.byAsset.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {s.byAsset.slice(0, 6).map((g) => (
                <li key={g.key} className="flex justify-between gap-3 py-2 text-[13px]">
                  <Link href={`/assets/${g.key}`} className="truncate text-ink-soft hover:text-ink hover:underline">
                    {s.assetTitles[g.key] ?? "Deleted asset"}
                  </Link>
                  <span className="tabular-nums">{usd(g.costUsd)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No costs linked to an asset yet.</p>
          )}
        </section>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-[22px] font-light">Every request</h2>
        {s.recent.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing yet. Each image generation, sharpening and Claude request will appear here with its cost.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto border-y border-line">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-cream text-left">
                <tr className="border-b border-rule">
                  {["Date", "Task", "Model", "Usage", "Asset", "Cost"].map((h) => (
                    <th key={h} className={`eyebrow py-2.5 pr-4 font-semibold ${h === "Cost" ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.recent.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-4 whitespace-nowrap text-muted">{new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2 pr-4">{OPS[e.operation] ?? e.operation}</td>
                    <td className="py-2 pr-4 text-ink-soft">{e.model.split("/").pop()}</td>
                    <td className="py-2 pr-4 text-muted">{quantity(e)}</td>
                    <td className="max-w-[220px] truncate py-2 pr-4">
                      {e.assetId ? (
                        <Link href={`/assets/${e.assetId}`} className="text-ink-soft hover:underline">
                          {s.assetTitles[e.assetId] ?? "Deleted"}
                        </Link>
                      ) : (
                        <span className="text-muted">Image library</span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{usd(e.costUsd, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-[22px] font-light">Prices used for the estimates</h2>
            <p className="mt-1 max-w-[720px] text-[13px] text-ink-soft">
              Costs are computed from what each request used (megapixels, tokens) and these prices, in US dollars, as published in October 2026. If a provider changes its prices, correct them here. Invoices remain on{" "}
              <a className="underline" href="https://replicate.com/account/billing" target="_blank" rel="noreferrer">
                Replicate
              </a>{" "}
              and the{" "}
              <a className="underline" href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer">
                Anthropic Console
              </a>
              .
            </p>
          </div>
          <div className="flex gap-2">
            {s.customised.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={resetPrices}>
                Reset to defaults
              </button>
            )}
            <button className="btn btn-outline btn-sm" disabled={!Object.keys(editing).length} onClick={savePrices}>
              Save prices
            </button>
          </div>
        </div>
        <table className="w-full border-y border-line text-[13px]">
          <tbody className="divide-y divide-line">
            {Object.entries(s.prices).map(([model, p]) => (
              <tr key={model}>
                <td className="py-2.5 pr-4">
                  {model}
                  {s.customised.includes(model) && <span className="tag ml-2 bg-sable text-taupe">Edited</span>}
                </td>
                <td className="py-2.5 pr-4 text-muted">{p.note}</td>
                <td className="py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[12px] text-muted">
                    {p.kind === "megapixels" && (
                      <>
                        first MP {priceField(model, "firstMp", p.firstMp)} extra MP {priceField(model, "extraMp", p.extraMp)}
                      </>
                    )}
                    {p.kind === "units" && <>per unit {priceField(model, "perUnit", p.perUnit)}</>}
                    {p.kind === "tokens" && (
                      <>
                        input {priceField(model, "input", p.input)} output {priceField(model, "output", p.output)} cache read {priceField(model, "cacheRead", p.cacheRead)}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

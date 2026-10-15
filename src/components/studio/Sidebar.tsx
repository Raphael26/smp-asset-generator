"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { api, usd } from "@/components/ui/api";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Create", icon: "wand" },
  { href: "/library", label: "Library", icon: "grid" },
  { href: "/new", label: "From a template", icon: "plus" },
  { href: "/images", label: "Images", icon: "image" },
  { href: "/costs", label: "Costs", icon: "coins" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

type SettingsResponse = { settings: { monthlyBudgetUsd: number }; keys: { anthropic: boolean; replicate: boolean }; monthUsd: number };

export function Sidebar() {
  const path = usePathname();
  const [info, setInfo] = useState<SettingsResponse | null>(null);
  useEffect(() => {
    api<SettingsResponse>("/api/settings").then(setInfo).catch(() => {});
  }, [path]);

  // The editor needs the whole width: the sidebar shrinks to icons there.
  const compact = path.startsWith("/assets/");
  const budget = info?.settings.monthlyBudgetUsd ?? 0;
  const pct = budget > 0 && info ? Math.min(100, (info.monthUsd / budget) * 100) : 0;
  const missingKeys = info && (!info.keys.anthropic || !info.keys.replicate);

  return (
    <aside className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-paper ${compact ? "w-[68px]" : "w-[232px]"}`}>
      <Link href="/" className={`flex items-center gap-3 border-b border-line ${compact ? "justify-center px-0 py-5" : "px-6 py-6"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/monogram.svg" alt="Spanish Mum in Paris" className="h-[22px] w-auto" />
        {!compact && <span className="eyebrow pt-0.5">Studio</span>}
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              title={n.label}
              className={`flex items-center gap-3 px-3 py-2.5 text-[13.5px] transition-colors ${compact ? "justify-center" : ""} ${
                active ? "bg-stone text-ink" : "text-ink-soft hover:bg-cream hover:text-ink"
              }`}
            >
              <Icon name={n.icon} size={17} />
              {!compact && n.label}
            </Link>
          );
        })}
      </nav>
      {!compact && info && (
        <div className="border-t border-line px-6 py-5">
          {missingKeys && (
            <Link href="/settings" className="mb-4 flex items-start gap-2 text-[12.5px] leading-snug text-flag">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
              <span>{!info.keys.anthropic && !info.keys.replicate ? "API keys missing" : !info.keys.anthropic ? "Anthropic key missing" : "Replicate key missing"}</span>
            </Link>
          )}
          <Link href="/costs" className="block">
            <p className="eyebrow mb-2">This month</p>
            <p className="display text-[26px]">{usd(info.monthUsd)}</p>
            {budget > 0 && (
              <>
                <div className="mt-3 h-[3px] w-full bg-stone">
                  <div className={`h-full ${pct >= 90 ? "bg-flag" : "bg-taupe-logo"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-[12px] text-muted">of {usd(budget, 0)} budget</p>
              </>
            )}
          </Link>
        </div>
      )}
    </aside>
  );
}

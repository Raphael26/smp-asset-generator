// Brand colours, from the brand guidelines (v1.0, October 2026), section 02.
import type { GroundId, UniverseId } from "@/lib/content";

export const COLORS = {
  cream: "#F7F4EE",
  paper: "#FFFDF9",
  ink: "#302B27",
  inkSoft: "#4D453F",
  taupe: "#6F6054",
  taupeLogo: "#8A6E5B",
  stone: "#EEE8DF",
  band: "#E8DFD4",
  line: "#DED7CD",
  ruleStrong: "#B9AA9B",
  quote: "#76675B",
  sable: "#EFE6D8",
  sauge: "#E5E8DE",
  saugeInk: "#535C49",
  blush: "#F0E2DC",
} as const;

/** Light grounds only (rule 1). The universe tints fill blocks, never a whole slide. */
export const GROUNDS: { id: GroundId; label: string; hex: string; use: string }[] = [
  { id: "cream", label: "Cream", hex: COLORS.cream, use: "Default ground" },
  { id: "paper", label: "Paper", hex: COLORS.paper, use: "Lighter, alternates with cream" },
  { id: "stone", label: "Stone", hex: COLORS.stone, use: "Quiet panel" },
  { id: "band", label: "Band", hex: COLORS.band, use: "Closing slide" },
];

export const UNIVERSES: {
  id: UniverseId;
  number: string;
  short: string; // the French label used in tags and eyebrows
  name: string; // the English universe name, kept in English everywhere
  tint: string;
  tintInk: string;
}[] = [
  { id: "decoration", number: "01", short: "Décoration", name: "Interior Design", tint: COLORS.sable, tintInk: COLORS.taupe },
  { id: "organisation", number: "02", short: "Organisation", name: "Home Coaching & Management", tint: COLORS.sauge, tintInk: COLORS.saugeInk },
  { id: "entreprises", number: "03", short: "Entreprises", name: "Corporate Workshops", tint: COLORS.blush, tintInk: COLORS.taupe },
];

export function universe(id: string | null | undefined) {
  return UNIVERSES.find((u) => u.id === id) ?? null;
}

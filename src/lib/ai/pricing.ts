// Default prices, in US dollars, as published by the providers in October 2026.
// They are estimates the app uses to log costs; Rebeca can correct them on the Costs page.

export type PriceRule =
  | { kind: "megapixels"; firstMp: number; extraMp: number; inputMp: number; note: string }
  | { kind: "units"; perUnit: number; mpPerUnit: number; note: string }
  | { kind: "tokens"; input: number; output: number; cacheWrite: number; cacheRead: number; note: string }; // per million tokens

export const DEFAULT_PRICES: Record<string, PriceRule> = {
  "black-forest-labs/flux-2-max": { kind: "megapixels", firstMp: 0.07, extraMp: 0.03, inputMp: 0.03, note: "First output megapixel, then each extra one" },
  "black-forest-labs/flux-2-pro": { kind: "megapixels", firstMp: 0.03, extraMp: 0.015, inputMp: 0.015, note: "First output megapixel, then each extra one" },
  "topazlabs/image-upscale": { kind: "units", perUnit: 0.05, mpPerUnit: 24, note: "One unit per 24 output megapixels" },
  "claude-opus-5-5": { kind: "tokens", input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2, note: "Per million tokens" },
  "claude-sonnet-5-5": { kind: "tokens", input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2, note: "Per million tokens" },
  "claude-haiku-5-5": { kind: "tokens", input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01, note: "Per million tokens" },
  "claude-opus-4-8": { kind: "tokens", input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5, note: "Per million tokens (refusal fallback)" },
};

export const IMAGE_MODELS = [
  { id: "black-forest-labs/flux-2-max", name: "Flux 2 Max", description: "Best quality: the website’s images were made with it." },
  { id: "black-forest-labs/flux-2-pro", name: "Flux 2 Pro", description: "About half the price, slightly less detail." },
] as const;

export const UPSCALE_MODEL = "topazlabs/image-upscale";
export const CLAUDE_MODEL = "claude-opus-5-5";

export function priceFor(model: string, overrides: Record<string, PriceRule> = {}): PriceRule | null {
  return overrides[model] ?? DEFAULT_PRICES[model] ?? null;
}

export function imageCost(rule: PriceRule | null, outputMp: number, inputMp = 0): number {
  if (!rule) return 0;
  if (rule.kind === "megapixels") {
    const mp = Math.max(1, Math.ceil(outputMp - 0.05));
    return rule.firstMp + rule.extraMp * (mp - 1) + rule.inputMp * Math.ceil(inputMp);
  }
  if (rule.kind === "units") return rule.perUnit * Math.max(1, Math.ceil(outputMp / rule.mpPerUnit));
  return 0;
}

export type TokenUsage = { input: number; output: number; cacheWrite: number; cacheRead: number };

export function tokenCost(rule: PriceRule | null, u: TokenUsage): number {
  if (!rule || rule.kind !== "tokens") return 0;
  return (u.input * rule.input + u.output * rule.output + u.cacheWrite * rule.cacheWrite + u.cacheRead * rule.cacheRead) / 1_000_000;
}

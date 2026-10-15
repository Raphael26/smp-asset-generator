import { estimateGenerationCost, generationSize, startGeneration, startUpscale } from "@/lib/ai/images";
import { writeImagePrompt } from "@/lib/ai/claude";
import { presetPrompt } from "@/lib/brand/image-presets";
import { errorResponse, UserFacingError } from "@/lib/errors";

/**
 * POST { action: "estimate" | "generate" | "upscale" | "prompt", … }
 * - estimate: { model, frameWidth, frameHeight, count, upscale } → { costUsd, width, height }
 * - prompt:   { idea, presetId, frameWidth, frameHeight } → Claude writes the English prompt
 * - generate: { prompt?, idea?, presetId?, model, frameWidth, frameHeight, count, upscale, label?, assetId? } → jobs
 * - upscale:  { mediaId, assetId? } → job
 */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const frameWidth = Number(b.frameWidth) || 1080;
    const frameHeight = Number(b.frameHeight) || 1350;
    switch (b.action) {
      case "estimate": {
        const { width, height } = generationSize(frameWidth, frameHeight);
        return Response.json({ width, height, costUsd: estimateGenerationCost(String(b.model), width, height, Number(b.count) || 1, Boolean(b.upscale)) });
      }
      case "prompt":
        return Response.json(
          await writeImagePrompt({ idea: String(b.idea ?? ""), presetId: b.presetId ?? null, width: frameWidth, height: frameHeight, assetId: b.assetId ?? null }),
        );
      case "generate": {
        // Without a prompt written by Claude, the preset scene and Rebeca's words are combined directly.
        const prompt = String(b.prompt ?? "").trim() || presetPrompt(b.presetId ?? null, String(b.idea ?? ""));
        const jobs = await startGeneration({
          prompt,
          idea: b.idea ? String(b.idea) : undefined,
          model: String(b.model),
          frameWidth,
          frameHeight,
          count: Number(b.count) || 1,
          upscale: Boolean(b.upscale),
          label: b.label ? String(b.label) : "",
          assetId: b.assetId ?? null,
        });
        return Response.json({ jobs });
      }
      case "upscale":
        return Response.json({ jobs: [await startUpscale(String(b.mediaId), b.assetId ?? null)] });
      default:
        throw new UserFacingError("Unknown action.");
    }
  } catch (err) {
    return errorResponse(err);
  }
}

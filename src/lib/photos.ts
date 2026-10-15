// Starts the generation of the photos Claude described for an asset's slides.
import { getAsset, setPhotoJobs } from "@/lib/assets";
import { startGeneration } from "@/lib/ai/images";
import { getFormat } from "@/lib/brand/formats";
import { galleryFrame, imageFrame } from "@/lib/brand/layouts";
import { getSettings } from "@/lib/settings";

export async function startSlidePhotos(assetId: string, items: { slideId: string; prompt: string; galleryIndex?: number }[]) {
  const asset = getAsset(assetId);
  const format = getFormat(asset.formatId);
  const settings = getSettings();
  const started: { slideId: string; jobId: string; prompt: string; galleryIndex?: number }[] = [];
  for (const item of items) {
    const slide = asset.content.slides.find((s) => s.id === item.slideId);
    const frame = slide ? (item.galleryIndex !== undefined ? galleryFrame() : imageFrame(slide.layout, format)) : null;
    if (!slide || !frame || !item.prompt.trim()) continue;
    const [job] = await startGeneration({
      prompt: item.prompt,
      model: settings.defaultImageModel,
      frameWidth: frame.width,
      frameHeight: frame.height,
      count: 1,
      upscale: settings.defaultUpscale,
      label: asset.title,
      assetId,
      targetSlideId: slide.id,
      ...(item.galleryIndex !== undefined ? { targetGallery: item.galleryIndex } : {}),
    });
    started.push({ slideId: slide.id, jobId: job.id, prompt: item.prompt, ...(item.galleryIndex !== undefined ? { galleryIndex: item.galleryIndex } : {}) });
  }
  if (started.length) setPhotoJobs(assetId, started);
  return started;
}

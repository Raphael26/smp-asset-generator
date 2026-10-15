import { getAsset } from "@/lib/assets";
import { RenderSlides } from "./RenderSlides";

// The page Chrome captures for exports: the slides alone, at their real size.
export const dynamic = "force-dynamic";

export default async function RenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slide?: string; mode?: string }>;
}) {
  const { id } = await params;
  const { slide, mode } = await searchParams;
  const asset = getAsset(id);
  return <RenderSlides asset={asset} slide={mode === "pdf" ? null : Number(slide ?? 0)} />;
}

import { Editor } from "@/components/editor/Editor";

export default async function AssetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  return <Editor id={id} created={created === "1"} />;
}

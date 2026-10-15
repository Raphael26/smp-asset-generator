import fs from "node:fs";
import { exportFilePath } from "@/lib/render/export";
import { errorResponse } from "@/lib/errors";

const TYPES: Record<string, string> = { png: "image/png", pdf: "application/pdf", zip: "application/zip" };

export async function GET(req: Request, { params }: { params: Promise<{ exportId: string; file: string }> }) {
  try {
    const { exportId, file } = await params;
    const name = decodeURIComponent(file);
    const p = exportFilePath(exportId, name);
    const ext = name.split(".").pop() ?? "";
    const inline = new URL(req.url).searchParams.has("inline");
    return new Response(fs.readFileSync(p), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

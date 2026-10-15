import { getAsset } from "@/lib/assets";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { improveText, reviewAsset, writeCaption } from "@/lib/ai/claude";
import { editWithPrompt, regenerateFromPrompt } from "@/lib/ai/compose";
import { errorResponse, UserFacingError } from "@/lib/errors";

// Claude works on the asset as saved: the editor saves before calling.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const asset = getAsset(id);
    const body = await req.json();
    switch (body.action) {
      case "improve":
        return Response.json(
          await improveText(asset, {
            slide: typeof body.slide === "number" ? body.slide : null,
            instruction: String(body.instruction ?? ""),
            includeCaption: Boolean(body.includeCaption),
          }),
        );
      case "caption":
        return Response.json(await writeCaption(asset, body.mode === "improve" ? "improve" : "write", String(body.instruction ?? "")));
      case "review":
        return Response.json(await reviewAsset(asset));
      // A proposal only: the editor shows it and applies it if Rebeca says so.
      case "edit":
      case "regenerate": {
        const text = String(body.instruction ?? body.prompt ?? "").trim();
        if (text.length < 3) throw new UserFacingError("Say what you would like.");
        const media = db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).all();
        const proposal = body.action === "edit" ? await editWithPrompt(asset, text, media) : await regenerateFromPrompt(asset, text, media);
        return Response.json(proposal);
      }
      default:
        throw new UserFacingError("Unknown action.");
    }
  } catch (err) {
    return errorResponse(err);
  }
}

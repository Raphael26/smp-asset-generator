import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { composeFromPrompt, parseOptions } from "@/lib/ai/compose";
import { createAssetFromContent } from "@/lib/assets";
import { startSlidePhotos } from "@/lib/photos";
import { keysStatus } from "@/lib/settings";
import { errorResponse, UserFacingError } from "@/lib/errors";

/** Rebeca's prompt → a finished asset, with its photos on their way. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 8) throw new UserFacingError("Describe the visual you want in a sentence or two.");
    const options = parseOptions(body.options ?? {});
    const media = db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).all();

    const proposal = await composeFromPrompt(prompt, options, media);
    const asset = createAssetFromContent({
      title: proposal.title,
      formatId: proposal.formatId,
      universe: proposal.universe,
      content: proposal.content,
      prompt,
      promptOptions: options,
      notes: proposal.notes.map((n) => `· ${n}`).join("\n"),
    });

    const notes = [...proposal.notes];
    let photos = 0;
    if (proposal.generate.length) {
      if (keysStatus().replicate) {
        try {
          photos = (await startSlidePhotos(asset.id, proposal.generate)).length;
        } catch (e) {
          notes.push(`The photos could not be started: ${(e as Error).message}`);
        }
      } else {
        notes.push("Photos not generated: the Replicate key is missing. The photo prompts are kept: generate them from each photo slide once the key is set.");
      }
    }
    return Response.json({ asset: { id: asset.id }, notes, photos });
  } catch (err) {
    return errorResponse(err);
  }
}

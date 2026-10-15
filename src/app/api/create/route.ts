import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { composeFromPrompt, parseOptions } from "@/lib/ai/compose";
import { createAssetFromContent } from "@/lib/assets";
import { startSlidePhotos } from "@/lib/photos";
import { getSettings, keysStatus } from "@/lib/settings";
import { errorResponse, UserFacingError } from "@/lib/errors";

/** Rebeca's prompt → a finished asset, with its photos on their way (or described, waiting on their slides). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 8) throw new UserFacingError("Describe the visual you want in a sentence or two.");
    const options = parseOptions(body.options ?? {});
    const autoPhotos = typeof body.autoPhotos === "boolean" ? body.autoPhotos : getSettings().autoPhotos;
    const media = db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).all();

    const proposal = await composeFromPrompt(prompt, options, media);
    const notes = [...proposal.notes];
    const described = proposal.generate.length;
    const start = described > 0 && autoPhotos && keysStatus().replicate;
    if (described && !autoPhotos) {
      notes.push(`${described} photo${described > 1 ? "s" : ""} described but not generated (automatic photos are off): open each photo slide and click « Generate this photo » ($0.10 each).`);
    } else if (described && !keysStatus().replicate) {
      notes.push("Photos not generated: the Replicate key is missing. The photo prompts are kept: generate them from each photo slide once the key is set.");
    }

    const asset = createAssetFromContent({
      title: proposal.title,
      formatId: proposal.formatId,
      universe: proposal.universe,
      content: proposal.content,
      prompt,
      promptOptions: options,
      notes: notes.map((n) => `· ${n}`).join("\n"),
    });

    let photos = 0;
    if (start) {
      try {
        photos = (await startSlidePhotos(asset.id, proposal.generate)).length;
      } catch (e) {
        notes.push(`The photos could not be started: ${(e as Error).message}`);
      }
    }
    return Response.json({ asset: { id: asset.id }, notes, photos, described });
  } catch (err) {
    return errorResponse(err);
  }
}

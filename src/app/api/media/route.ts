import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { saveImage } from "@/lib/media";
import { errorResponse, UserFacingError } from "@/lib/errors";

export async function GET() {
  try {
    const media = db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).all();
    return Response.json({ media });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Upload one or more photos (multipart field "files"). Uploaded photos count as real photos. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) throw new UserFacingError("No file received.");
    const isAi = form.get("isAi") === "true";
    const saved = [];
    for (const file of files) {
      if (file.size > 40 * 1024 * 1024) throw new UserFacingError(`${file.name} is larger than 40 MB.`);
      try {
        saved.push(
          await saveImage(Buffer.from(await file.arrayBuffer()), {
            kind: "upload",
            isAi,
            label: file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
          }),
        );
      } catch {
        throw new UserFacingError(`${file.name} could not be read as an image.`);
      }
    }
    return Response.json({ media: saved });
  } catch (err) {
    return errorResponse(err);
  }
}

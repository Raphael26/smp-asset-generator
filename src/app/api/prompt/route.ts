import { improvePrompt, parseOptions } from "@/lib/ai/compose";
import { errorResponse, UserFacingError } from "@/lib/errors";

/** « Improve my prompt »: Claude turns Rebeca's prompt into a fuller brief, in her language. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 8) throw new UserFacingError("Write a first idea, even short, then improve it.");
    return Response.json(await improvePrompt(prompt, parseOptions(body.options ?? {})));
  } catch (err) {
    return errorResponse(err);
  }
}

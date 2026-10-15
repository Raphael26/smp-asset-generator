import { cancelJob, refreshJobs, runningJobs } from "@/lib/ai/images";
import { errorResponse } from "@/lib/errors";

/** ?ids=a,b refreshes those jobs from Replicate; without ids, lists the running ones. */
export async function GET(req: Request) {
  try {
    const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
    if (!ids.length) return Response.json({ jobs: runningJobs() });
    return Response.json({ jobs: await refreshJobs(ids) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (id) await cancelJob(id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

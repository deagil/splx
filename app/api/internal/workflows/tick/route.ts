import { timingSafeEqual } from "node:crypto";
import { processDueSchedules } from "@/server/workflows/worker";

/**
 * Internal worker tick. Outside endpoint() — no user session.
 *
 * Auth: `Authorization: Bearer <secret>` where secret is
 * `WORKFLOW_RUNNER_SECRET` or, on Vercel Cron, `CRON_SECRET`.
 * Returns 404 when neither is set so the route is invisible where unconfigured.
 *
 * Vercel Cron invokes with GET; Coolify/curl can use POST.
 */
async function handleTick(req: Request): Promise<Response> {
  const secret =
    process.env.WORKFLOW_RUNNER_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return new Response(null, { status: 404 });
  }

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const provided = Buffer.from(header);
  const target = Buffer.from(expected);

  if (
    provided.length !== target.length ||
    !timingSafeEqual(provided, target)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueSchedules({ limit: 25 });
  return Response.json({ data: result });
}

export const GET = handleTick;
export const POST = handleTick;

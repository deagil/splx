import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { listEvents } from "@/server/repositories/activity";

/**
 * Event fact log, newest first. Fan-out into workflow_schedule happens inside
 * emitEvent(); this route is read-only history.
 */
export const GET = endpoint({
  auth: "required",
  permission: "workspace.view",
  async handler({ user, query }) {
    const rawLimit = query.get("limit");
    const limit = rawLimit === null ? undefined : Number(rawLimit);
    if (limit !== undefined && Number.isNaN(limit)) {
      throw new ApiError(400, "limit must be a number");
    }

    const entries = await listEvents(user.workspaceId, {
      limit,
      before: query.get("before") ?? undefined,
    });

    return {
      data: { entries },
      meta: {
        nextCursor:
          entries.length > 0 && entries.length === (limit ?? 50)
            ? entries.at(-1)?.createdAt.toISOString()
            : null,
      },
    };
  },
});

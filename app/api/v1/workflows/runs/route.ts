import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { listWorkflowRuns } from "@/server/repositories/workflows";

export const GET = endpoint({
  auth: "required",
  permission: "workflows.view",
  async handler({ user, query }) {
    const rawLimit = query.get("limit");
    const limit = rawLimit === null ? undefined : Number(rawLimit);
    if (limit !== undefined && Number.isNaN(limit)) {
      throw new ApiError(400, "limit must be a number");
    }

    const entries = await listWorkflowRuns(user.workspaceId, {
      workflowId: query.get("workflowId") ?? undefined,
      limit,
      before: query.get("before") ?? undefined,
    });

    return {
      data: { entries },
      meta: {
        nextCursor:
          entries.length > 0 && entries.length === (limit ?? 50)
            ? entries.at(-1)?.startedAt.toISOString()
            : null,
      },
    };
  },
});

import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { listAuditLogs } from "@/server/repositories/activity";

/**
 * Audit trail, newest first.
 *
 * Gated on `workspace.view` (admin and builder). That is stricter than the
 * table's RLS policy, which allows any workspace member to read — audit entries
 * name who did what, so they should not be workspace-wide reading material.
 *
 * Keyset pagination: pass the last row's `createdAt` back as `?before=`.
 */
export const GET = endpoint({
  auth: "required",
  async handler({ user, query }) {
    const rawLimit = query.get("limit");
    const limit = rawLimit === null ? undefined : Number(rawLimit);
    if (limit !== undefined && Number.isNaN(limit)) {
      throw new ApiError(400, "limit must be a number");
    }

    const entries = await listAuditLogs(user.workspaceId, {
      before: query.get("before") ?? undefined,
      limit,
    });

    return {
      data: { entries },
      meta: {
        // Null when this page is not full, i.e. there is nothing older.
        nextCursor:
          entries.length > 0 && entries.length === (limit ?? 50)
            ? entries.at(-1)?.createdAt.toISOString()
            : null,
      },
    };
  },
  permission: "workspace.view",
});

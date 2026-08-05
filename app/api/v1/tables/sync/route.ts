import { syncTablesForTenant } from "@/lib/server/tables/sync";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";

/**
 * Introspects the resource store and upserts every user table into the
 * `tables` config registry. The work lives in `lib/server/tables/sync` so a
 * script or automation can call it without going through HTTP.
 */
export const POST = endpoint({
  auth: "required",
  async handler({ user, requestId }) {
    const result = await syncTablesForTenant(user.tenant);

    await writeAuditLog({
      action: "tables.synced",
      actorUserId: user.userId,
      changes: { synced: result.synced, total: result.total },
      requestId,
      resourceType: "table",
      workspaceId: user.workspaceId,
    });

    return { data: result };
  },
  permission: "tables.edit",
});

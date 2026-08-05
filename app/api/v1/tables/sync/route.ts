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
  permission: "tables.edit",
  async handler({ user, requestId }) {
    const result = await syncTablesForTenant(user.tenant);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "tables.synced",
      resourceType: "table",
      changes: { synced: result.synced, total: result.total },
      requestId,
    });

    return { data: result };
  },
});

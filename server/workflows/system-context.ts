import { eq } from "drizzle-orm";
import { workspace } from "@/lib/db/schema";
import { getAppMode, type TenantContext } from "@/lib/server/tenant/context";
import { getControlPlaneDb } from "@/server/lib/db";

/**
 * Builds a TenantContext for the workflow worker, which has no Supabase session.
 *
 * Roles are intentionally empty: authorization for workflow *actions* is decided
 * at authoring time (`workflows.edit`). Fabricating admin here would widen the
 * blast radius of a misconfigured workflow for no gain — nothing in the data
 * repository enforces on `tenant.roles`.
 */
export async function systemTenantContext(
  workspaceId: string,
  actorUserId?: string | null
): Promise<TenantContext> {
  const [row] = await getControlPlaneDb()
    .select({
      id: workspace.id,
      mode: workspace.mode,
    })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  if (!row) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  return {
    mode: row.mode === "hosted" ? "hosted" : getAppMode(),
    workspaceId: row.id,
    userId: actorUserId ?? "00000000-0000-0000-0000-000000000000",
    roles: [],
    connectionId: null,
  };
}

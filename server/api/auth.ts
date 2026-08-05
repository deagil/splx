import { resolveTenantContext } from "@/lib/server/tenant/context";
import type { EndpointUser } from "./types";

/**
 * Adapts the existing tenant resolution to the control plane's user shape.
 *
 * `resolveTenantContext()` stays the single place that reads the Supabase
 * session and resolves workspace + roles — this is an adapter, not a
 * reimplementation. It throws `Error("Unauthorized")` when there is no session,
 * which `handleError` maps to a 401.
 */
export async function resolveEndpointUser(
  headers?: Headers
): Promise<EndpointUser> {
  const tenant = await resolveTenantContext(headers ? { headers } : {});

  return {
    mode: tenant.mode,
    roles: tenant.roles,
    tenant,
    userId: tenant.userId,
    workspaceId: tenant.workspaceId,
  };
}

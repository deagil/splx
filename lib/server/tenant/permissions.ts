import { DEFAULT_ROLE_PERMISSIONS } from "@/server/permissions/definitions";
import {
  checkPermissionAgainstMap,
  permissionMatches,
} from "@/server/permissions/match";
import type { TenantContext } from "./context";

/**
 * Synchronous capability check for routes that have not moved to the
 * `endpoint()` control plane yet.
 *
 * This used to carry its own hand-maintained role→capability map, which had
 * drifted from the `role_permissions` table it claimed to mirror: it was
 * missing every `reports.*`, `chat.*`, and `workspace.*` grant, and it matched
 * permission strings exactly, with no `resource.*` wildcard expansion. The
 * effect was that a `builder` was denied `reports.view` even though both the DB
 * and the RLS policies granted it.
 *
 * It now shares the control plane's definitions and matcher. It stays
 * synchronous — and therefore static-map-only — because it has 17 call sites
 * that are not async-aware. The control plane's `checkPermission()` reads
 * `role_permissions` from the database and should be preferred for new code.
 */

const STATIC_ROLE_MAP: Record<string, string[]> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([roleId, permissions]) => [
    roleId,
    [...permissions],
  ])
);

export function hasCapability(
  tenant: TenantContext,
  capability: string
): boolean {
  return checkPermissionAgainstMap(STATIC_ROLE_MAP, tenant.roles, capability);
}

export function requireCapability(
  tenant: TenantContext,
  capability: string
): void {
  if (!hasCapability(tenant, capability)) {
    throw new Error("Forbidden");
  }
}

export { permissionMatches };

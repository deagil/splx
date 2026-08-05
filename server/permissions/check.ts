import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from "./definitions";
import {
  checkPermissionAgainstMap,
  resolveEffectivePermissions,
  type RolePermissionMap,
  type RolePermissionRow,
} from "./match";

export {
  checkPermissionAgainstMap,
  permissionMatches,
  resolveEffectivePermissions,
} from "./match";

const CACHE_TTL_MS = 60_000;

/** Cached per workspace, since resolution depends on that workspace's overrides. */
const cache = new Map<string, { map: RolePermissionMap; loadedAt: number }>();

function staticMap(): RolePermissionMap {
  const map: RolePermissionMap = {};
  for (const [roleId, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    map[roleId] = [...permissions];
  }
  return map;
}

/**
 * Reads `role_permissions` through the Supabase client (select-only RLS policy
 * for workspace members) and resolves workspace overrides.
 *
 * Cached briefly because the table is small and read on every permissioned
 * request. Falls back to {@link DEFAULT_ROLE_PERMISSIONS} if the table is
 * unreachable — e.g. a checkout that has not run `pnpm db:migrate` yet.
 */
async function loadRolePermissions(
  workspaceId: string
): Promise<RolePermissionMap> {
  const cached = cache.get(workspaceId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.map;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role_id, permission, workspace_id")
      .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as RolePermissionRow[];

    // An empty table means the seed never ran; prefer the static baseline over
    // denying every request.
    if (rows.length === 0) {
      return staticMap();
    }

    const map = resolveEffectivePermissions(rows, workspaceId);
    cache.set(workspaceId, { map, loadedAt: Date.now() });
    return map;
  } catch (error) {
    console.error("[permissions] falling back to static role map", {
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return staticMap();
  }
}

export type PermissionCheck = {
  workspaceId: string;
  roles: string[];
  permission: Permission | string;
};

export async function hasPermission({
  workspaceId,
  roles,
  permission,
}: PermissionCheck): Promise<boolean> {
  const map = await loadRolePermissions(workspaceId);
  return checkPermissionAgainstMap(map, roles, permission);
}

/**
 * Throws `Error("Forbidden")` when the caller lacks the permission. The string
 * is load-bearing: `server/api/responses.ts` maps it to a 403, and existing
 * `lib/server/*` callers already match on it.
 */
export async function checkPermission(check: PermissionCheck): Promise<void> {
  if (!(await hasPermission(check))) {
    throw new Error("Forbidden");
  }
}

/** Test seam — drops the cached `role_permissions` snapshots. */
export function resetPermissionCache(): void {
  cache.clear();
}

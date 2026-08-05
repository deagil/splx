import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from "./definitions";
import { checkPermissionAgainstMap, type RolePermissionMap } from "./match";

export { checkPermissionAgainstMap, permissionMatches } from "./match";

const CACHE_TTL_MS = 60_000;

let cache: { map: RolePermissionMap; loadedAt: number } | null = null;

/**
 * Reads `role_permissions` through the Supabase client (the table has a
 * select-only RLS policy for authenticated users). Cached briefly because the
 * table is global, tiny, and read on every permissioned request.
 *
 * Falls back to {@link DEFAULT_ROLE_PERMISSIONS} if the table is unreachable —
 * e.g. a checkout that has not run `pnpm db:migrate` yet.
 */
async function loadRolePermissions(): Promise<RolePermissionMap> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.map;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role_id, permission");

    if (error) {
      throw new Error(error.message);
    }

    const map: RolePermissionMap = {};
    for (const row of data ?? []) {
      const roleId = row.role_id as string;
      const permission = row.permission as string;
      map[roleId] ??= [];
      map[roleId].push(permission);
    }

    // An empty table means the seed never ran; prefer the static baseline over
    // denying every request.
    if (Object.keys(map).length === 0) {
      return staticMap();
    }

    cache = { map, loadedAt: Date.now() };
    return map;
  } catch (error) {
    console.error("[permissions] falling back to static role map", {
      error: error instanceof Error ? error.message : String(error),
    });
    return staticMap();
  }
}

function staticMap(): RolePermissionMap {
  const map: RolePermissionMap = {};
  for (const [roleId, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    map[roleId] = [...permissions];
  }
  return map;
}

export async function hasPermission(
  roles: string[],
  permission: Permission | string
): Promise<boolean> {
  const map = await loadRolePermissions();
  return checkPermissionAgainstMap(map, roles, permission);
}

/**
 * Throws `Error("Forbidden")` when the caller lacks the permission. The string
 * is load-bearing: `server/api/responses.ts` maps it to a 403, and existing
 * `lib/server/*` callers already match on it.
 */
export async function checkPermission(
  roles: string[],
  permission: Permission | string
): Promise<void> {
  if (!(await hasPermission(roles, permission))) {
    throw new Error("Forbidden");
  }
}

/** Test seam — drops the cached `role_permissions` snapshot. */
export function resetPermissionCache(): void {
  cache = null;
}

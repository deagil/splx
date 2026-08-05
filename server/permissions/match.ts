import { canonicalizePermission } from "./definitions";

export type RolePermissionMap = Record<string, string[]>;

/**
 * Matches a granted permission string against a requested one, supporting the
 * same wildcards as the SQL `user_has_access()` helper: a bare `*` grants
 * everything, and `resource.*` grants every action on that resource.
 *
 * The previous `hasCapability()` did exact matching only, so a `builder` was
 * denied `reports.view` even though `role_permissions` granted it.
 *
 * Kept free of imports beyond the permission vocabulary so it stays trivially
 * testable and usable from both the sync and async check paths.
 */
export function permissionMatches(granted: string, requested: string): boolean {
  if (granted === "*") {
    return true;
  }

  if (granted === requested) {
    return true;
  }

  if (granted.endsWith(".*")) {
    const resource = granted.slice(0, -2);
    return requested.startsWith(`${resource}.`);
  }

  return false;
}

export function checkPermissionAgainstMap(
  map: RolePermissionMap,
  roles: string[],
  permission: string
): boolean {
  const requested = canonicalizePermission(permission);

  return roles.some((role) => {
    const granted = map[role] ?? [];
    return granted.some((entry) => permissionMatches(entry, requested));
  });
}

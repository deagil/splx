import { canonicalizePermission } from "./definitions";

export type RolePermissionMap = Record<string, string[]>;

export interface RolePermissionRow {
  permission: string;
  role_id: string;
  workspace_id: string | null;
}

/**
 * Resolves `role_permissions` rows into an effective role → permissions map for
 * one workspace.
 *
 * Mirrors the SQL `effective_role_permissions()` helper exactly: if a workspace
 * defines any rows for a role, those rows are that role's complete permission
 * set there and the global rows are ignored. Otherwise the global rows apply.
 *
 * Both sides must agree, or the API and RLS would disagree about what a role
 * can do — so this is kept pure and tested against the same cases as the SQL.
 */
export function resolveEffectivePermissions(
  rows: RolePermissionRow[],
  workspaceId: string
): RolePermissionMap {
  const global: RolePermissionMap = {};
  const scoped: RolePermissionMap = {};

  for (const row of rows) {
    if (row.workspace_id === null) {
      global[row.role_id] ??= [];
      global[row.role_id].push(row.permission);
    } else if (row.workspace_id === workspaceId) {
      scoped[row.role_id] ??= [];
      scoped[row.role_id].push(row.permission);
    }
  }

  // Workspace rows override global ones per role.
  return { ...global, ...scoped };
}

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

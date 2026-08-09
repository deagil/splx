/**
 * Permission vocabulary for the API control plane.
 *
 * Notation is `resource.action`, matching the `role_permissions` table and the
 * SQL helpers (`user_has_access`) that the RLS policies call. Keeping one
 * notation across SQL and TypeScript is deliberate: an alternative
 * `resource:action:scope` form would have made `role_permissions`, the 44 RLS
 * policies, and this file three separate dialects of the same idea.
 *
 * The `role_permissions` table is the source of truth at runtime. The static
 * map below is a fallback for when that table is unreachable (fresh checkout
 * before `pnpm db:migrate`, or a DB blip) and the baseline that the migration
 * seeds.
 */

export const PERMISSIONS = [
  "*",

  "pages.view",
  "pages.edit",

  "tables.view",
  "tables.edit",

  "data.view",
  "data.create",
  "data.edit",
  "data.delete",

  "reports.view",
  "reports.edit",

  "chat.view",
  "chat.create",

  "workspace.view",
  "workspace.edit",
  "workspace.manage",
  "workspace.users",
  "workspace.invites",
  "workspace.billing",

  "workflows.view",
  "workflows.edit",
  "workflows.run",

  "comms.view",
  "comms.edit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Permission strings used by existing route handlers that were never added to
 * either the static map or `role_permissions`, mapped onto their canonical
 * name. `data.read` was a typo for `data.view` that silently 403'd every
 * non-admin caller of `/api/data/[tableName]/schema`.
 */
const PERMISSION_ALIASES: Record<string, Permission> = {
  "data.read": "data.view",
  "data.update": "data.edit",
  "data.write": "data.edit",
};

export function canonicalizePermission(permission: string): Permission {
  const alias = PERMISSION_ALIASES[permission];
  if (alias) {
    return alias;
  }
  return permission as Permission;
}

/**
 * Baseline role grants. Mirrors the rows seeded by
 * `20251215200000_resource_permissions.sql` plus the two permissions that
 * routes gated on but nothing ever granted (`workspace.manage`).
 *
 * Note: `roles` is workspace-scoped (composite PK `workspace_id, id`) while
 * `role_permissions` is global. A workspace that defines a custom role gets no
 * permissions from either source and is denied everything. That gap is known
 * and out of scope here; see docs/RBAC_SYSTEM.md.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  admin: ["*"],
  builder: [
    "pages.view",
    "pages.edit",
    "tables.view",
    "tables.edit",
    "data.view",
    "data.create",
    "data.edit",
    "data.delete",
    "reports.view",
    "reports.edit",
    "workspace.view",
    "chat.view",
    "chat.create",
    "workflows.view",
    "workflows.edit",
    "workflows.run",
    "comms.view",
    "comms.edit",
  ],
  user: [
    "pages.view",
    "tables.view",
    "data.view",
    "data.create",
    "data.edit",
    "data.delete",
    "reports.view",
    "chat.view",
    "chat.create",
    "workflows.view",
    "workflows.run",
    "comms.view",
  ],
  viewer: [
    "pages.view",
    "tables.view",
    "data.view",
    "reports.view",
    "chat.view",
    "workflows.view",
    "comms.view",
  ],
};

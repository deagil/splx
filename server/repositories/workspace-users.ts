import { and, eq, ne } from "drizzle-orm";
import { role, user, workspace, workspaceUser } from "@/lib/db/schema";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import { emitEvent } from "@/server/lib/events";
import { getControlPlaneDb } from "@/server/lib/db";

/**
 * Workspace membership management.
 *
 * The routes this replaces carried a `// TODO: Add proper RBAC check here` and
 * performed none, so any authenticated member could change another member's
 * role or remove them from the workspace. The permission gate now lives on the
 * route (`workspace.users`), and the invariants that a permission check alone
 * cannot express live here:
 *
 * - the workspace owner cannot be demoted or removed;
 * - the last admin cannot be demoted or removed, or the workspace becomes
 *   unadministrable;
 * - a role must exist in *this* workspace before it can be assigned, since
 *   `roles` is workspace-scoped.
 */

export type WorkspaceMember = {
  id: string;
  role_id: string;
  created_at: Date;
  user_id: string;
  users: {
    id: string;
    email: string;
    firstname: string | null;
    lastname: string | null;
    avatar_url: string | null;
    job_title: string | null;
  } | null;
};

export type WorkspaceUsersContext = {
  workspaceId: string;
  actorUserId: string;
  requestId?: string;
};

export async function listWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const rows = await getControlPlaneDb()
    .select({
      id: workspaceUser.id,
      role_id: workspaceUser.role_id,
      created_at: workspaceUser.created_at,
      user_id: workspaceUser.user_id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      avatar_url: user.avatar_url,
      job_title: user.job_title,
    })
    .from(workspaceUser)
    .leftJoin(user, eq(user.id, workspaceUser.user_id))
    .where(eq(workspaceUser.workspace_id, workspaceId))
    .orderBy(workspaceUser.created_at);

  return rows.map((row) => ({
    id: row.id,
    role_id: row.role_id,
    created_at: row.created_at,
    user_id: row.user_id,
    users: row.email
      ? {
          id: row.user_id,
          email: row.email,
          firstname: row.firstname,
          lastname: row.lastname,
          avatar_url: row.avatar_url,
          job_title: row.job_title,
        }
      : null,
  }));
}

/** The membership row, scoped to the workspace so cross-workspace ids 404. */
async function requireMembership(workspaceId: string, membershipId: string) {
  const [membership] = await getControlPlaneDb()
    .select({
      id: workspaceUser.id,
      user_id: workspaceUser.user_id,
      role_id: workspaceUser.role_id,
    })
    .from(workspaceUser)
    .where(
      and(
        eq(workspaceUser.id, membershipId),
        eq(workspaceUser.workspace_id, workspaceId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new ApiError(404, "Workspace member not found");
  }

  return membership;
}

async function isWorkspaceOwner(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const [row] = await getControlPlaneDb()
    .select({ ownerId: workspace.owner_user_id })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  return row?.ownerId === userId;
}

/** True when demoting or removing this membership would leave zero admins. */
async function isLastAdmin(
  workspaceId: string,
  membershipId: string,
  currentRoleId: string
): Promise<boolean> {
  if (currentRoleId !== "admin") {
    return false;
  }

  const others = await getControlPlaneDb()
    .select({ id: workspaceUser.id })
    .from(workspaceUser)
    .where(
      and(
        eq(workspaceUser.workspace_id, workspaceId),
        eq(workspaceUser.role_id, "admin"),
        ne(workspaceUser.id, membershipId)
      )
    )
    .limit(1);

  return others.length === 0;
}

export async function updateMemberRole(
  context: WorkspaceUsersContext,
  membershipId: string,
  roleId: string
): Promise<void> {
  const { workspaceId, actorUserId, requestId } = context;
  const db = getControlPlaneDb();

  const membership = await requireMembership(workspaceId, membershipId);

  // `roles` is workspace-scoped, so an id valid in one workspace may not exist
  // in another. Without this the composite FK would reject it as a 500.
  const [targetRole] = await db
    .select({ id: role.id })
    .from(role)
    .where(and(eq(role.workspace_id, workspaceId), eq(role.id, roleId)))
    .limit(1);

  if (!targetRole) {
    throw new ApiError(400, `Role "${roleId}" does not exist in this workspace`);
  }

  if (membership.role_id === roleId) {
    return;
  }

  if (await isWorkspaceOwner(workspaceId, membership.user_id)) {
    throw new ApiError(403, "The workspace owner's role cannot be changed");
  }

  if (await isLastAdmin(workspaceId, membershipId, membership.role_id)) {
    throw new ApiError(
      400,
      "Cannot change the role of the last admin in this workspace"
    );
  }

  await db
    .update(workspaceUser)
    .set({ role_id: roleId, updated_at: new Date() })
    .where(
      and(
        eq(workspaceUser.id, membershipId),
        eq(workspaceUser.workspace_id, workspaceId)
      )
    );

  await writeAuditLog({
    workspaceId,
    actorUserId,
    action: "workspace.member_role_changed",
    resourceType: "workspace_user",
    resourceId: membershipId,
    changes: { from: membership.role_id, to: roleId, userId: membership.user_id },
    requestId,
  });

  await emitEvent({
    workspaceId,
    eventName: "workspace.member_role_changed",
    payload: {
      membershipId,
      userId: membership.user_id,
      from: membership.role_id,
      to: roleId,
    },
    actorUserId,
    requestId,
  });
}

export async function removeMember(
  context: WorkspaceUsersContext,
  membershipId: string
): Promise<void> {
  const { workspaceId, actorUserId, requestId } = context;
  const db = getControlPlaneDb();

  const membership = await requireMembership(workspaceId, membershipId);

  if (await isWorkspaceOwner(workspaceId, membership.user_id)) {
    throw new ApiError(403, "The workspace owner cannot be removed");
  }

  if (await isLastAdmin(workspaceId, membershipId, membership.role_id)) {
    throw new ApiError(
      400,
      "Cannot remove the last admin from this workspace"
    );
  }

  await db
    .delete(workspaceUser)
    .where(
      and(
        eq(workspaceUser.id, membershipId),
        eq(workspaceUser.workspace_id, workspaceId)
      )
    );

  await writeAuditLog({
    workspaceId,
    actorUserId,
    action: "workspace.member_removed",
    resourceType: "workspace_user",
    resourceId: membershipId,
    changes: { userId: membership.user_id, roleId: membership.role_id },
    requestId,
  });

  await emitEvent({
    workspaceId,
    eventName: "workspace.member_removed",
    payload: { membershipId, userId: membership.user_id },
    actorUserId,
    requestId,
  });
}

export async function listWorkspaceRoles(workspaceId: string) {
  return getControlPlaneDb()
    .select({
      id: role.id,
      label: role.label,
      description: role.description,
      level: role.level,
    })
    .from(role)
    .where(eq(role.workspace_id, workspaceId))
    .orderBy(role.level);
}

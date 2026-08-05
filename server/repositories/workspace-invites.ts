import { and, eq, isNull } from "drizzle-orm";
import { role, user, workspaceInvite, workspaceUser } from "@/lib/db/schema";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import { getControlPlaneDb } from "@/server/lib/db";
import { emitEvent } from "@/server/lib/events";

/**
 * Workspace invitations.
 *
 * Like membership management, these routes previously had no permission check
 * of any kind, so any member could invite a new user **as admin** — a
 * privilege-escalation path that did not require being an admin first. The
 * route now requires `workspace.invites`, and the role being granted is
 * validated against this workspace's roles.
 */

export interface InviteContext {
  actorUserId: string;
  requestId?: string;
  workspaceId: string;
}

export async function listPendingInvites(workspaceId: string) {
  const rows = await getControlPlaneDb()
    .select({
      created_at: workspaceInvite.created_at,
      email: workspaceInvite.email,
      id: workspaceInvite.id,
      invited_by: workspaceInvite.invited_by,
      inviter_email: user.email,
      inviter_firstname: user.firstname,
      inviter_lastname: user.lastname,
      roles: workspaceInvite.roles,
    })
    .from(workspaceInvite)
    .leftJoin(user, eq(user.id, workspaceInvite.invited_by))
    .where(
      and(
        eq(workspaceInvite.workspace_id, workspaceId),
        isNull(workspaceInvite.accepted_at)
      )
    )
    .orderBy(workspaceInvite.created_at);

  return rows.map((row) => ({
    created_at: row.created_at,
    email: row.email,
    id: row.id,
    invited_by: row.invited_by,
    roles: row.roles,
    users: row.inviter_email
      ? {
          email: row.inviter_email,
          firstname: row.inviter_firstname,
          id: row.invited_by,
          lastname: row.inviter_lastname,
        }
      : null,
  }));
}

export async function createInvite(
  context: InviteContext,
  email: string,
  roleId: string
) {
  const { workspaceId, actorUserId, requestId } = context;
  const db = getControlPlaneDb();

  // `roles` is workspace-scoped; an id from another workspace must not be
  // grantable here.
  const [targetRole] = await db
    .select({ id: role.id })
    .from(role)
    .where(and(eq(role.workspace_id, workspaceId), eq(role.id, roleId)))
    .limit(1);

  if (!targetRole) {
    throw new ApiError(
      400,
      `Role "${roleId}" does not exist in this workspace`
    );
  }

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existingUser) {
    const [existingMember] = await db
      .select({ id: workspaceUser.id })
      .from(workspaceUser)
      .where(
        and(
          eq(workspaceUser.workspace_id, workspaceId),
          eq(workspaceUser.user_id, existingUser.id)
        )
      )
      .limit(1);

    if (existingMember) {
      throw new ApiError(400, "User is already a member of this workspace");
    }
  }

  const [invite] = await db
    .insert(workspaceInvite)
    .values({
      email,
      invited_by: actorUserId,
      roles: [roleId],
      workspace_id: workspaceId,
    })
    .returning();

  await writeAuditLog({
    action: "workspace.invite_created",
    actorUserId,
    changes: { email, roleId },
    requestId,
    resourceId: invite.id,
    resourceType: "workspace_invite",
    workspaceId,
  });

  // An email sender can subscribe to this rather than the route calling it
  // directly. (Sending is still a TODO in the product.)
  await emitEvent({
    actorUserId,
    eventName: "workspace.invite_created",
    payload: { email, inviteId: invite.id, roleId },
    requestId,
    workspaceId,
  });

  return invite;
}

export async function revokeInvite(
  context: InviteContext,
  inviteId: string
): Promise<void> {
  const { workspaceId, actorUserId, requestId } = context;
  const db = getControlPlaneDb();

  const deleted = await db
    .delete(workspaceInvite)
    .where(
      and(
        eq(workspaceInvite.id, inviteId),
        eq(workspaceInvite.workspace_id, workspaceId)
      )
    )
    .returning({ email: workspaceInvite.email, id: workspaceInvite.id });

  if (deleted.length === 0) {
    throw new ApiError(404, "Invite not found");
  }

  await writeAuditLog({
    action: "workspace.invite_revoked",
    actorUserId,
    changes: { email: deleted[0].email },
    requestId,
    resourceId: inviteId,
    resourceType: "workspace_invite",
    workspaceId,
  });
}

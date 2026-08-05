import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import {
  createInvite,
  listPendingInvites,
  revokeInvite,
} from "@/server/repositories/workspace-invites";

const createInviteSchema = z.object({
  email: z.string().email("A valid email address is required"),
  roleId: z.string().min(1),
});

/**
 * Creating and revoking invites requires `workspace.invites` (admin only).
 * Previously there was no check, so any member could invite a new user as
 * admin — escalation without needing to be an admin first.
 */
export const GET = endpoint({
  auth: "required",
  permission: "workspace.view",
  async handler({ user }) {
    const invites = await listPendingInvites(user.workspaceId);
    return { data: { invites } };
  },
});

export const POST = endpoint<z.infer<typeof createInviteSchema>>({
  auth: "required",
  permission: "workspace.invites",
  schema: createInviteSchema,
  async handler({ user, body, requestId }) {
    const invite = await createInvite(
      { workspaceId: user.workspaceId, actorUserId: user.userId, requestId },
      body.email,
      body.roleId
    );

    return { data: { invite }, status: 201 };
  },
});

export const DELETE = endpoint({
  auth: "required",
  permission: "workspace.invites",
  async handler({ user, query, requestId }) {
    const inviteId = query.get("id");
    if (!inviteId) {
      throw new ApiError(400, "Missing invite ID");
    }

    await revokeInvite(
      { workspaceId: user.workspaceId, actorUserId: user.userId, requestId },
      inviteId
    );

    return { data: { success: true } };
  },
});

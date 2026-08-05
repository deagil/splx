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
  async handler({ user }) {
    const invites = await listPendingInvites(user.workspaceId);
    return { data: { invites } };
  },
  permission: "workspace.view",
});

export const POST = endpoint<z.infer<typeof createInviteSchema>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    const invite = await createInvite(
      { actorUserId: user.userId, requestId, workspaceId: user.workspaceId },
      body.email,
      body.roleId
    );

    return { data: { invite }, status: 201 };
  },
  permission: "workspace.invites",
  schema: createInviteSchema,
});

export const DELETE = endpoint({
  auth: "required",
  async handler({ user, query, requestId }) {
    const inviteId = query.get("id");
    if (!inviteId) {
      throw new ApiError(400, "Missing invite ID");
    }

    await revokeInvite(
      { actorUserId: user.userId, requestId, workspaceId: user.workspaceId },
      inviteId
    );

    return { data: { success: true } };
  },
  permission: "workspace.invites",
});

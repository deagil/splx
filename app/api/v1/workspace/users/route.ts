import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import {
  listWorkspaceMembers,
  removeMember,
  updateMemberRole,
} from "@/server/repositories/workspace-users";

const patchSchema = z.object({
  workspaceUserId: z.string().min(1),
  roleId: z.string().min(1),
});

/**
 * Reading the member list only needs to be a member of the workspace, so it is
 * gated on `workspace.view`. Mutations need `workspace.users`, which only admin
 * holds — previously there was no check at all and any member could change
 * another member's role or remove them.
 */
export const GET = endpoint({
  auth: "required",
  permission: "workspace.view",
  async handler({ user }) {
    const users = await listWorkspaceMembers(user.workspaceId);
    return { data: { users } };
  },
});

export const PATCH = endpoint<z.infer<typeof patchSchema>>({
  auth: "required",
  permission: "workspace.users",
  schema: patchSchema,
  async handler({ user, body, requestId }) {
    await updateMemberRole(
      {
        workspaceId: user.workspaceId,
        actorUserId: user.userId,
        requestId,
      },
      body.workspaceUserId,
      body.roleId
    );

    return { data: { success: true } };
  },
});

export const DELETE = endpoint({
  auth: "required",
  permission: "workspace.users",
  async handler({ user, query, requestId }) {
    const membershipId = query.get("id");
    if (!membershipId) {
      throw new ApiError(400, "Missing workspace user ID");
    }

    await removeMember(
      {
        workspaceId: user.workspaceId,
        actorUserId: user.userId,
        requestId,
      },
      membershipId
    );

    return { data: { success: true } };
  },
});

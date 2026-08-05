import { endpoint } from "@/server/api/endpoint";
import { listWorkspaceRoles } from "@/server/repositories/workspace-users";

/** Role definitions for the current workspace. */
export const GET = endpoint({
  auth: "required",
  permission: "workspace.view",
  async handler({ user }) {
    const roles = await listWorkspaceRoles(user.workspaceId);
    return { data: { roles } };
  },
});

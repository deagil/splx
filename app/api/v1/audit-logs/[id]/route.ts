import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { getAuditLog } from "@/server/repositories/activity";

type Params = { id: string };

export const GET = endpoint<undefined, Params>({
  auth: "required",
  permission: "workspace.view",
  async handler({ user, params }) {
    const entry = await getAuditLog(user.workspaceId, params.id);

    if (!entry) {
      throw new ApiError(404, "Audit log entry not found");
    }

    return { data: { entry } };
  },
});

import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { getEvent } from "@/server/repositories/activity";

interface Params {
  id: string;
}

export const GET = endpoint<undefined, Params>({
  auth: "required",
  async handler({ user, params }) {
    const entry = await getEvent(user.workspaceId, params.id);

    if (!entry) {
      throw new ApiError(404, "Event not found");
    }

    return { data: { entry } };
  },
  permission: "workspace.view",
});

import { getPageById } from "@/lib/server/pages";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";

interface Params {
  pageId: string;
}

export const GET = endpoint<undefined, Params>({
  auth: "required",
  async handler({ user, params }) {
    const page = await getPageById(user.tenant, params.pageId);

    if (!page) {
      throw new ApiError(404, "Page not found");
    }

    return { data: { page } };
  },
  permission: "pages.view",
});

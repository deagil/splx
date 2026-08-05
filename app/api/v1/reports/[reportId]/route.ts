import { getReport } from "@/lib/server/reports";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";

interface Params {
  reportId: string;
}

export const GET = endpoint<undefined, Params>({
  auth: "required",
  async handler({ user, params }) {
    const report = await getReport(user.tenant, params.reportId);

    if (!report) {
      throw new ApiError(404, "Report not found");
    }

    return { data: { report } };
  },
  permission: "reports.view",
});

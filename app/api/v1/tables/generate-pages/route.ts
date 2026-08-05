import { z } from "zod";
import { getTableConfig } from "@/lib/server/tables";
import { generatePagesForTable } from "@/lib/server/tables/pages/generator";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";

const bodySchema = z.object({
  tableId: z.string().min(1, "Table ID is required"),
});

export const POST = endpoint<z.infer<typeof bodySchema>>({
  auth: "required",
  permission: "tables.edit",
  schema: bodySchema,
  async handler({ user, body, requestId }) {
    const tableConfig = await getTableConfig(user.tenant, body.tableId);
    if (!tableConfig) {
      throw new ApiError(404, "Table not found");
    }

    await generatePagesForTable(user.tenant, tableConfig);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "pages.generated",
      resourceType: "table",
      resourceId: body.tableId,
      requestId,
    });

    return { data: { success: true } };
  },
});

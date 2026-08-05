import { z } from "zod";
import {
  deleteTableConfig,
  getTableConfig,
  updateTableConfig,
} from "@/lib/server/tables";
import { invalidateTableMetadataCache } from "@/lib/server/tables/cache";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";

interface Params {
  tableId: string;
}

const updateTableBodySchema = z.record(z.string(), z.unknown());

export const GET = endpoint<undefined, Params>({
  auth: "required",
  async handler({ user, params }) {
    const table = await getTableConfig(user.tenant, params.tableId);

    if (!table) {
      throw new ApiError(404, "Table not found");
    }

    return { data: { table } };
  },
  permission: "tables.view",
});

export const PATCH = endpoint<Record<string, unknown>, Params>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const table = await updateTableConfig(user.tenant, params.tableId, body);
    await invalidateTableMetadataCache(user.tenant, params.tableId);

    await writeAuditLog({
      action: "tables.updated",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: params.tableId,
      resourceType: "table",
      workspaceId: user.workspaceId,
    });

    return { data: { table } };
  },
  permission: "tables.edit",
  schema: updateTableBodySchema,
});

export const DELETE = endpoint<undefined, Params>({
  auth: "required",
  async handler({ user, params, requestId }) {
    await deleteTableConfig(user.tenant, params.tableId);
    await invalidateTableMetadataCache(user.tenant, params.tableId);

    await writeAuditLog({
      action: "tables.deleted",
      actorUserId: user.userId,
      requestId,
      resourceId: params.tableId,
      resourceType: "table",
      workspaceId: user.workspaceId,
    });

    return { data: { success: true } };
  },
  permission: "tables.edit",
});

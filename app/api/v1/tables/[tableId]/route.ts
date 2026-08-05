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

type Params = { tableId: string };

const updateTableBodySchema = z.record(z.string(), z.unknown());

export const GET = endpoint<undefined, Params>({
  auth: "required",
  permission: "tables.view",
  async handler({ user, params }) {
    const table = await getTableConfig(user.tenant, params.tableId);

    if (!table) {
      throw new ApiError(404, "Table not found");
    }

    return { data: { table } };
  },
});

export const PATCH = endpoint<Record<string, unknown>, Params>({
  auth: "required",
  permission: "tables.edit",
  schema: updateTableBodySchema,
  async handler({ user, params, body, requestId }) {
    const table = await updateTableConfig(user.tenant, params.tableId, body);
    await invalidateTableMetadataCache(user.tenant, params.tableId);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "tables.updated",
      resourceType: "table",
      resourceId: params.tableId,
      changes: body,
      requestId,
    });

    return { data: { table } };
  },
});

export const DELETE = endpoint<undefined, Params>({
  auth: "required",
  permission: "tables.edit",
  async handler({ user, params, requestId }) {
    await deleteTableConfig(user.tenant, params.tableId);
    await invalidateTableMetadataCache(user.tenant, params.tableId);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "tables.deleted",
      resourceType: "table",
      resourceId: params.tableId,
      requestId,
    });

    return { data: { success: true } };
  },
});

import { z } from "zod";
import { createTableConfig } from "@/lib/server/tables";
import {
  listPhysicalTables,
  type TableListingType,
} from "@/lib/server/tables/list-physical";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";

const createTableBodySchema = z.record(z.string(), z.unknown());

export const GET = endpoint({
  auth: "required",
  permission: "tables.view",
  async handler({ user, query }) {
    const rawType = query.get("type") ?? "data";
    if (rawType !== "data" && rawType !== "config") {
      throw new ApiError(400, 'type must be "data" or "config"');
    }

    const tables = await listPhysicalTables(
      user.tenant,
      rawType as TableListingType
    );

    return { data: { tables } };
  },
});

export const POST = endpoint<Record<string, unknown>>({
  auth: "required",
  permission: "tables.edit",
  schema: createTableBodySchema,
  async handler({ user, body, requestId }) {
    const table = await createTableConfig(user.tenant, body);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "tables.created",
      resourceType: "table",
      resourceId: table.id,
      changes: body,
      requestId,
    });

    return { data: { table }, status: 201 };
  },
});

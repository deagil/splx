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
  permission: "tables.view",
});

export const POST = endpoint<Record<string, unknown>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    const table = await createTableConfig(user.tenant, body);

    await writeAuditLog({
      action: "tables.created",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: table.id,
      resourceType: "table",
      workspaceId: user.workspaceId,
    });

    return { data: { table }, status: 201 };
  },
  permission: "tables.edit",
  schema: createTableBodySchema,
});

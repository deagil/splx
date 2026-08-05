import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import {
  createEventType,
  listEventTypes,
} from "@/server/repositories/event-types";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  payloadSchema: z.record(z.string(), z.unknown()).optional(),
});

export const GET = endpoint({
  auth: "required",
  permission: "workflows.view",
  async handler({ user }) {
    const eventTypes = await listEventTypes(user.workspaceId);
    return { data: { eventTypes } };
  },
});

export const POST = endpoint<z.infer<typeof createSchema>>({
  auth: "required",
  permission: "workflows.edit",
  schema: createSchema,
  async handler({ user, body, requestId }) {
    const created = await createEventType(user.workspaceId, user.userId, {
      name: body.name,
      description: body.description,
      payloadSchema: body.payloadSchema,
    });

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "event_types.created",
      resourceType: "event_type",
      resourceId: created.id,
      changes: body,
      requestId,
    });

    return { data: { eventType: created }, status: 201 };
  },
});

import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import {
  createEventType,
  listEventTypes,
} from "@/server/repositories/event-types";

const createSchema = z.object({
  description: z.string().nullable().optional(),
  name: z.string().min(1),
  payloadSchema: z.record(z.string(), z.unknown()).optional(),
});

export const GET = endpoint({
  auth: "required",
  async handler({ user }) {
    const eventTypes = await listEventTypes(user.workspaceId);
    return { data: { eventTypes } };
  },
  permission: "workflows.view",
});

export const POST = endpoint<z.infer<typeof createSchema>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    const created = await createEventType(user.workspaceId, user.userId, {
      description: body.description,
      name: body.name,
      payloadSchema: body.payloadSchema,
    });

    await writeAuditLog({
      action: "event_types.created",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: created.id,
      resourceType: "event_type",
      workspaceId: user.workspaceId,
    });

    return { data: { eventType: created }, status: 201 };
  },
  permission: "workflows.edit",
  schema: createSchema,
});

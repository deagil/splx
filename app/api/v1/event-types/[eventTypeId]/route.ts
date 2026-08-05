import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import {
  deleteEventType,
  updateEventType,
} from "@/server/repositories/event-types";

const updateSchema = z.object({
  description: z.string().nullable().optional(),
  payloadSchema: z.record(z.string(), z.unknown()).optional(),
});

export const PATCH = endpoint<
  z.infer<typeof updateSchema>,
  { eventTypeId: string }
>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const updated = await updateEventType(
      user.workspaceId,
      params.eventTypeId,
      body
    );
    if (!updated) {
      throw new ApiError(404, "Event type not found");
    }

    await writeAuditLog({
      action: "event_types.updated",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: updated.id,
      resourceType: "event_type",
      workspaceId: user.workspaceId,
    });

    return { data: { eventType: updated } };
  },
  permission: "workflows.edit",
  schema: updateSchema,
});

export const DELETE = endpoint<undefined, { eventTypeId: string }>({
  auth: "required",
  async handler({ user, params, requestId }) {
    const deleted = await deleteEventType(user.workspaceId, params.eventTypeId);
    if (!deleted) {
      throw new ApiError(404, "Event type not found");
    }

    await writeAuditLog({
      action: "event_types.deleted",
      actorUserId: user.userId,
      changes: {},
      requestId,
      resourceId: params.eventTypeId,
      resourceType: "event_type",
      workspaceId: user.workspaceId,
    });

    return { data: { success: true } };
  },
  permission: "workflows.edit",
});

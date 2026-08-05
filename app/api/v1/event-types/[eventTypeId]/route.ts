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
  permission: "workflows.edit",
  schema: updateSchema,
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
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "event_types.updated",
      resourceType: "event_type",
      resourceId: updated.id,
      changes: body,
      requestId,
    });

    return { data: { eventType: updated } };
  },
});

export const DELETE = endpoint<undefined, { eventTypeId: string }>({
  auth: "required",
  permission: "workflows.edit",
  async handler({ user, params, requestId }) {
    const deleted = await deleteEventType(
      user.workspaceId,
      params.eventTypeId
    );
    if (!deleted) {
      throw new ApiError(404, "Event type not found");
    }

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "event_types.deleted",
      resourceType: "event_type",
      resourceId: params.eventTypeId,
      changes: {},
      requestId,
    });

    return { data: { success: true } };
  },
});

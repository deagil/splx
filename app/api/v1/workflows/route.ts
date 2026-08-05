import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import {
  createWorkflow,
  listWorkflows,
} from "@/server/repositories/workflows";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  triggerType: z.enum(["event", "manual"]),
  eventName: z.string().nullable().optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const GET = endpoint({
  auth: "required",
  permission: "workflows.view",
  async handler({ user }) {
    const workflows = await listWorkflows(user.workspaceId);
    return { data: { workflows } };
  },
});

export const POST = endpoint<z.infer<typeof createSchema>>({
  auth: "required",
  permission: "workflows.edit",
  schema: createSchema,
  async handler({ user, body, requestId }) {
    const created = await createWorkflow(user.workspaceId, user.userId, {
      name: body.name,
      description: body.description,
      enabled: body.enabled,
      triggerType: body.triggerType,
      eventName: body.eventName,
      steps: body.steps,
    });

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "workflows.created",
      resourceType: "workflow",
      resourceId: created.id,
      changes: body,
      requestId,
    });

    return { data: { workflow: created }, status: 201 };
  },
});

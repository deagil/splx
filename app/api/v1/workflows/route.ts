import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import { createWorkflow, listWorkflows } from "@/server/repositories/workflows";

const createSchema = z.object({
  description: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  eventName: z.string().nullable().optional(),
  name: z.string().min(1),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
  triggerType: z.enum(["event", "manual"]),
});

export const GET = endpoint({
  auth: "required",
  async handler({ user }) {
    const workflows = await listWorkflows(user.workspaceId);
    return { data: { workflows } };
  },
  permission: "workflows.view",
});

export const POST = endpoint<z.infer<typeof createSchema>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    const created = await createWorkflow(user.workspaceId, user.userId, {
      description: body.description,
      enabled: body.enabled,
      eventName: body.eventName,
      name: body.name,
      steps: body.steps,
      triggerType: body.triggerType,
    });

    await writeAuditLog({
      action: "workflows.created",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: created.id,
      resourceType: "workflow",
      workspaceId: user.workspaceId,
    });

    return { data: { workflow: created }, status: 201 };
  },
  permission: "workflows.edit",
  schema: createSchema,
});

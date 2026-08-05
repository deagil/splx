import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import {
  deleteWorkflow,
  getWorkflow,
  updateWorkflow,
} from "@/server/repositories/workflows";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  triggerType: z.enum(["event", "manual"]).optional(),
  eventName: z.string().nullable().optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const GET = endpoint<undefined, { workflowId: string }>({
  auth: "required",
  permission: "workflows.view",
  async handler({ user, params }) {
    const workflow = await getWorkflow(user.workspaceId, params.workflowId);
    if (!workflow) {
      throw new ApiError(404, "Workflow not found");
    }
    return { data: { workflow } };
  },
});

export const PATCH = endpoint<
  z.infer<typeof updateSchema>,
  { workflowId: string }
>({
  auth: "required",
  permission: "workflows.edit",
  schema: updateSchema,
  async handler({ user, params, body, requestId }) {
    const workflow = await updateWorkflow(
      user.workspaceId,
      params.workflowId,
      body
    );
    if (!workflow) {
      throw new ApiError(404, "Workflow not found");
    }

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "workflows.updated",
      resourceType: "workflow",
      resourceId: workflow.id,
      changes: body,
      requestId,
    });

    return { data: { workflow } };
  },
});

export const DELETE = endpoint<undefined, { workflowId: string }>({
  auth: "required",
  permission: "workflows.edit",
  async handler({ user, params, requestId }) {
    const deleted = await deleteWorkflow(user.workspaceId, params.workflowId);
    if (!deleted) {
      throw new ApiError(404, "Workflow not found");
    }

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "workflows.deleted",
      resourceType: "workflow",
      resourceId: params.workflowId,
      changes: {},
      requestId,
    });

    return { data: { success: true } };
  },
});

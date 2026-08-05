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
  description: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  eventName: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
  triggerType: z.enum(["event", "manual"]).optional(),
});

export const GET = endpoint<undefined, { workflowId: string }>({
  auth: "required",
  async handler({ user, params }) {
    const workflow = await getWorkflow(user.workspaceId, params.workflowId);
    if (!workflow) {
      throw new ApiError(404, "Workflow not found");
    }
    return { data: { workflow } };
  },
  permission: "workflows.view",
});

export const PATCH = endpoint<
  z.infer<typeof updateSchema>,
  { workflowId: string }
>({
  auth: "required",
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
      action: "workflows.updated",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: workflow.id,
      resourceType: "workflow",
      workspaceId: user.workspaceId,
    });

    return { data: { workflow } };
  },
  permission: "workflows.edit",
  schema: updateSchema,
});

export const DELETE = endpoint<undefined, { workflowId: string }>({
  auth: "required",
  async handler({ user, params, requestId }) {
    const deleted = await deleteWorkflow(user.workspaceId, params.workflowId);
    if (!deleted) {
      throw new ApiError(404, "Workflow not found");
    }

    await writeAuditLog({
      action: "workflows.deleted",
      actorUserId: user.userId,
      changes: {},
      requestId,
      resourceId: params.workflowId,
      resourceType: "workflow",
      workspaceId: user.workspaceId,
    });

    return { data: { success: true } };
  },
  permission: "workflows.edit",
});

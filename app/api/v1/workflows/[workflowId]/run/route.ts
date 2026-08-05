import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import { getWorkflow } from "@/server/repositories/workflows";
import { enqueueManualRun } from "@/server/workflows/worker";

const runSchema = z.object({
  context: z.record(z.string(), z.unknown()).optional(),
  triggerSource: z
    .enum(["manual", "trigger_block", "manual_replay"])
    .optional(),
});

export const POST = endpoint<z.infer<typeof runSchema>, { workflowId: string }>(
  {
    auth: "required",
    async handler({ user, params, body, requestId }) {
      const workflow = await getWorkflow(user.workspaceId, params.workflowId);
      if (!workflow) {
        throw new ApiError(404, "Workflow not found");
      }

      const { scheduleId } = await enqueueManualRun({
        actorUserId: user.userId,
        context: body.context ?? { event: null, steps: [] },
        requestId,
        triggerSource: body.triggerSource ?? "manual",
        workflowId: params.workflowId,
        workspaceId: user.workspaceId,
      });

      await writeAuditLog({
        action: "workflows.run",
        actorUserId: user.userId,
        changes: {
          scheduleId,
          triggerSource: body.triggerSource ?? "manual",
        },
        requestId,
        resourceId: params.workflowId,
        resourceType: "workflow",
        workspaceId: user.workspaceId,
      });

      return { data: { scheduleId }, status: 202 };
    },
    permission: "workflows.run",
    schema: runSchema,
  }
);

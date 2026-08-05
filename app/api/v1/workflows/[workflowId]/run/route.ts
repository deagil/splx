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
    permission: "workflows.run",
    schema: runSchema,
    async handler({ user, params, body, requestId }) {
      const workflow = await getWorkflow(user.workspaceId, params.workflowId);
      if (!workflow) {
        throw new ApiError(404, "Workflow not found");
      }

      const { scheduleId } = await enqueueManualRun({
        workspaceId: user.workspaceId,
        workflowId: params.workflowId,
        actorUserId: user.userId,
        requestId,
        triggerSource: body.triggerSource ?? "manual",
        context: body.context ?? { event: null, steps: [] },
      });

      await writeAuditLog({
        workspaceId: user.workspaceId,
        actorUserId: user.userId,
        action: "workflows.run",
        resourceType: "workflow",
        resourceId: params.workflowId,
        changes: {
          scheduleId,
          triggerSource: body.triggerSource ?? "manual",
        },
        requestId,
      });

      return { data: { scheduleId }, status: 202 };
    },
  }
);

import { and, eq, sql } from "drizzle-orm";
import {
  workflow,
  workflowRun,
  workflowSchedule,
  type WorkflowStepConfig,
} from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";
import { getControlPlaneDb } from "@/server/lib/db";
import { emitEvent } from "@/server/lib/events";
import { getAction } from "./actions";
import {
  CLAIM_LEASE_MS,
  DEFAULT_CLAIM_LIMIT,
  MAX_SCHEDULE_ATTEMPTS,
  MAX_WORKFLOW_DEPTH,
  nextRunAfter,
} from "./constants";
import { scheduleTick } from "./nudge";
import { systemTenantContext } from "./system-context";
import { resolveTemplateRecord } from "./template";

export type ProcessResult = {
  claimed: number;
  succeeded: number;
  failed: number;
};

type ClaimedSchedule = {
  id: string;
  workspace_id: string;
  workflow_id: string;
  event_id: string | null;
  status: string;
  trigger_source: string;
  attempts: number;
  context: Record<string, unknown>;
  depth: number;
  actor_user_id: string | null;
  request_id: string | null;
};

/**
 * Claims due `workflow_schedule` rows and executes their workflows.
 * Safe under concurrent callers via FOR UPDATE SKIP LOCKED.
 */
export async function processDueSchedules(options?: {
  limit?: number;
  requestId?: string;
}): Promise<ProcessResult> {
  const limit = options?.limit ?? DEFAULT_CLAIM_LIMIT;
  const claimed = await claimDueSchedules(limit);
  let succeeded = 0;
  let failed = 0;

  for (const item of claimed) {
    try {
      await executeSchedule(item, options?.requestId);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      console.error("[workflows] schedule execution failed", {
        scheduleId: item.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { claimed: claimed.length, succeeded, failed };
}

async function claimDueSchedules(limit: number): Promise<ClaimedSchedule[]> {
  const db = getControlPlaneDb();
  const leaseCutoff = new Date(Date.now() - CLAIM_LEASE_MS);

  const rows = (await db.execute(sql`
    UPDATE public.workflow_schedule
    SET status = 'running',
        locked_at = now(),
        attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM public.workflow_schedule
      WHERE status = 'pending'
        AND run_after <= now()
        AND (locked_at IS NULL OR locked_at < ${leaseCutoff})
      ORDER BY run_after
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING
      id,
      workspace_id,
      workflow_id,
      event_id,
      status,
      trigger_source,
      attempts,
      context,
      depth,
      actor_user_id,
      request_id
  `)) as ClaimedSchedule[];

  return rows;
}

async function executeSchedule(
  item: ClaimedSchedule,
  requestId?: string
): Promise<void> {
  const db = getControlPlaneDb();

  if (item.depth > MAX_WORKFLOW_DEPTH) {
    await markFailed(item, `Exceeded max workflow depth of ${MAX_WORKFLOW_DEPTH}`);
    return;
  }

  const [definition] = await db
    .select()
    .from(workflow)
    .where(eq(workflow.id, item.workflow_id))
    .limit(1);

  if (!definition) {
    await markFailed(item, "Workflow definition not found");
    return;
  }

  const [run] = await db
    .insert(workflowRun)
    .values({
      workspace_id: item.workspace_id,
      workflow_id: item.workflow_id,
      schedule_id: item.id,
      status: "running",
      steps: [],
    })
    .returning();

  if (!run) {
    await markFailed(item, "Failed to create workflow run");
    return;
  }

  const tenant = await systemTenantContext(
    item.workspace_id,
    item.actor_user_id
  );
  const runContext: Record<string, unknown> = {
    ...(item.context ?? {}),
    steps: [],
  };

  const stepResults: Array<{
    type: string;
    label?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    skipped?: boolean;
  }> = [];

  const steps = (definition.steps ?? []) as WorkflowStepConfig[];
  let failedError: string | null = null;

  for (const [index, step] of steps.entries()) {
    const action = getAction(step.type);
    if (!action) {
      failedError = `Unknown action type: ${step.type}`;
      stepResults.push({
        type: step.type,
        label: step.label,
        error: failedError,
      });
      break;
    }

    const rawInput = (step.input ?? {}) as Record<string, unknown>;
    const resolvedInput = resolveTemplateRecord(rawInput, runContext);

    try {
      const parsed = action.schema.parse(resolvedInput);
      const result = await action.execute(parsed, {
        tenant,
        workspaceId: item.workspace_id,
        requestId: item.request_id ?? requestId,
        runId: run.id,
        runContext,
      });

      stepResults.push({
        type: step.type,
        label: step.label,
        input: resolvedInput,
        output: result.output,
      });

      const prior = Array.isArray(runContext.steps)
        ? (runContext.steps as unknown[])
        : [];
      runContext.steps = [
        ...prior,
        { index, type: step.type, output: result.output },
      ];

      if (result.stop) {
        for (const remaining of steps.slice(index + 1)) {
          stepResults.push({
            type: remaining.type,
            label: remaining.label,
            skipped: true,
          });
        }
        break;
      }
    } catch (error) {
      failedError = error instanceof Error ? error.message : String(error);
      stepResults.push({
        type: step.type,
        label: step.label,
        input: resolvedInput,
        error: failedError,
      });
      break;
    }
  }

  const finishedAt = new Date();

  if (failedError) {
    await db
      .update(workflowRun)
      .set({
        status: "failed",
        steps: stepResults,
        error: failedError,
        finished_at: finishedAt,
      })
      .where(eq(workflowRun.id, run.id));

    await handleFailure(item, failedError);

    await emitEvent({
      workspaceId: item.workspace_id,
      eventName: "workflow.run.failed",
      payload: {
        workflowId: item.workflow_id,
        scheduleId: item.id,
        runId: run.id,
        error: failedError,
      },
      actorUserId: item.actor_user_id,
      requestId: item.request_id ?? requestId,
      causedByRunId: run.id,
    });
    return;
  }

  await db
    .update(workflowRun)
    .set({
      status: "succeeded",
      steps: stepResults,
      finished_at: finishedAt,
    })
    .where(eq(workflowRun.id, run.id));

  await db
    .update(workflowSchedule)
    .set({
      status: "done",
      locked_at: null,
      last_error: null,
    })
    .where(eq(workflowSchedule.id, item.id));

  await emitEvent({
    workspaceId: item.workspace_id,
    eventName: "workflow.run.succeeded",
    payload: {
      workflowId: item.workflow_id,
      scheduleId: item.id,
      runId: run.id,
    },
    actorUserId: item.actor_user_id,
    requestId: item.request_id ?? requestId,
    causedByRunId: run.id,
  });
}

async function handleFailure(
  item: ClaimedSchedule,
  errorMessage: string
): Promise<void> {
  const db = getControlPlaneDb();

  if (item.attempts >= MAX_SCHEDULE_ATTEMPTS) {
    await db
      .update(workflowSchedule)
      .set({
        status: "failed",
        locked_at: null,
        last_error: errorMessage,
      })
      .where(eq(workflowSchedule.id, item.id));
    return;
  }

  await db
    .update(workflowSchedule)
    .set({
      status: "pending",
      locked_at: null,
      last_error: errorMessage,
      run_after: nextRunAfter(item.attempts),
    })
    .where(eq(workflowSchedule.id, item.id));
}

async function markFailed(
  item: ClaimedSchedule,
  errorMessage: string
): Promise<void> {
  const db = getControlPlaneDb();
  await db
    .update(workflowSchedule)
    .set({
      status: "failed",
      locked_at: null,
      last_error: errorMessage,
    })
    .where(eq(workflowSchedule.id, item.id));
}

/**
 * Enqueues a manual (or trigger-block) run for a workflow.
 */
export async function enqueueManualRun(options: {
  workspaceId: string;
  workflowId: string;
  actorUserId: string;
  requestId?: string;
  triggerSource?: "manual" | "trigger_block" | "manual_replay";
  context?: Record<string, unknown>;
  eventId?: string | null;
}): Promise<{ scheduleId: string }> {
  const db = getControlPlaneDb();

  const [definition] = await db
    .select()
    .from(workflow)
    .where(
      and(
        eq(workflow.id, options.workflowId),
        eq(workflow.workspace_id, options.workspaceId)
      )
    )
    .limit(1);

  if (!definition) {
    throw new Error("Workflow not found");
  }

  const [row] = await db
    .insert(workflowSchedule)
    .values({
      workspace_id: options.workspaceId,
      workflow_id: options.workflowId,
      event_id: options.eventId ?? null,
      status: "pending",
      trigger_source: options.triggerSource ?? "manual",
      context: options.context ?? { event: null, steps: [] },
      depth: 0,
      actor_user_id: options.actorUserId,
      request_id: options.requestId ?? generateUUID(),
    })
    .returning({ id: workflowSchedule.id });

  if (!row) {
    throw new Error("Failed to enqueue workflow run");
  }

  scheduleTick();

  return { scheduleId: row.id };
}

import { and, eq, sql } from "drizzle-orm";
import {
  type WorkflowStepConfig,
  workflow,
  workflowRun,
  workflowSchedule,
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

export interface ProcessResult {
  claimed: number;
  failed: number;
  succeeded: number;
}

interface ClaimedSchedule {
  actor_user_id: string | null;
  attempts: number;
  context: Record<string, unknown>;
  depth: number;
  event_id: string | null;
  id: string;
  request_id: string | null;
  status: string;
  trigger_source: string;
  workflow_id: string;
  workspace_id: string;
}

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
        error: error instanceof Error ? error.message : String(error),
        scheduleId: item.id,
      });
    }
  }

  return { claimed: claimed.length, failed, succeeded };
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
    await markFailed(
      item,
      `Exceeded max workflow depth of ${MAX_WORKFLOW_DEPTH}`
    );
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
      schedule_id: item.id,
      status: "running",
      steps: [],
      workflow_id: item.workflow_id,
      workspace_id: item.workspace_id,
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
        error: failedError,
        label: step.label,
        type: step.type,
      });
      break;
    }

    const rawInput = (step.input ?? {}) as Record<string, unknown>;
    const resolvedInput = resolveTemplateRecord(rawInput, runContext);

    try {
      const parsed = action.schema.parse(resolvedInput);
      const result = await action.execute(parsed, {
        requestId: item.request_id ?? requestId,
        runContext,
        runId: run.id,
        tenant,
        workspaceId: item.workspace_id,
      });

      stepResults.push({
        input: resolvedInput,
        label: step.label,
        output: result.output,
        type: step.type,
      });

      const prior = Array.isArray(runContext.steps)
        ? (runContext.steps as unknown[])
        : [];
      runContext.steps = [
        ...prior,
        { index, output: result.output, type: step.type },
      ];

      if (result.stop) {
        for (const remaining of steps.slice(index + 1)) {
          stepResults.push({
            label: remaining.label,
            skipped: true,
            type: remaining.type,
          });
        }
        break;
      }
    } catch (error) {
      failedError = error instanceof Error ? error.message : String(error);
      stepResults.push({
        error: failedError,
        input: resolvedInput,
        label: step.label,
        type: step.type,
      });
      break;
    }
  }

  const finishedAt = new Date();

  if (failedError) {
    await db
      .update(workflowRun)
      .set({
        error: failedError,
        finished_at: finishedAt,
        status: "failed",
        steps: stepResults,
      })
      .where(eq(workflowRun.id, run.id));

    await handleFailure(item, failedError);

    await emitEvent({
      actorUserId: item.actor_user_id,
      causedByRunId: run.id,
      eventName: "workflow.run.failed",
      payload: {
        error: failedError,
        runId: run.id,
        scheduleId: item.id,
        workflowId: item.workflow_id,
      },
      requestId: item.request_id ?? requestId,
      workspaceId: item.workspace_id,
    });
    return;
  }

  await db
    .update(workflowRun)
    .set({
      finished_at: finishedAt,
      status: "succeeded",
      steps: stepResults,
    })
    .where(eq(workflowRun.id, run.id));

  await db
    .update(workflowSchedule)
    .set({
      last_error: null,
      locked_at: null,
      status: "done",
    })
    .where(eq(workflowSchedule.id, item.id));

  await emitEvent({
    actorUserId: item.actor_user_id,
    causedByRunId: run.id,
    eventName: "workflow.run.succeeded",
    payload: {
      runId: run.id,
      scheduleId: item.id,
      workflowId: item.workflow_id,
    },
    requestId: item.request_id ?? requestId,
    workspaceId: item.workspace_id,
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
        last_error: errorMessage,
        locked_at: null,
        status: "failed",
      })
      .where(eq(workflowSchedule.id, item.id));
    return;
  }

  await db
    .update(workflowSchedule)
    .set({
      last_error: errorMessage,
      locked_at: null,
      run_after: nextRunAfter(item.attempts),
      status: "pending",
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
      last_error: errorMessage,
      locked_at: null,
      status: "failed",
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
      actor_user_id: options.actorUserId,
      context: options.context ?? { event: null, steps: [] },
      depth: 0,
      event_id: options.eventId ?? null,
      request_id: options.requestId ?? generateUUID(),
      status: "pending",
      trigger_source: options.triggerSource ?? "manual",
      workflow_id: options.workflowId,
      workspace_id: options.workspaceId,
    })
    .returning({ id: workflowSchedule.id });

  if (!row) {
    throw new Error("Failed to enqueue workflow run");
  }

  scheduleTick();

  return { scheduleId: row.id };
}

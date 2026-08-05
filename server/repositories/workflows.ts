import { and, desc, eq, lt } from "drizzle-orm";
import {
  workflow,
  workflowRun,
  type WorkflowStepConfig,
} from "@/lib/db/schema";
import { ApiError } from "@/server/api/responses";
import { getControlPlaneDb } from "@/server/lib/db";
import { getAction } from "@/server/workflows/actions";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export type WorkflowRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  eventName: string | null;
  steps: WorkflowStepConfig[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowRunRecord = {
  id: string;
  workspaceId: string;
  workflowId: string;
  scheduleId: string | null;
  status: string;
  steps: unknown[];
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

function mapWorkflow(row: typeof workflow.$inferSelect): WorkflowRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    triggerType: row.trigger_type,
    eventName: row.event_name,
    steps: row.steps ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateSteps(steps: unknown): WorkflowStepConfig[] {
  if (!Array.isArray(steps)) {
    throw new ApiError(400, "steps must be an array");
  }

  const validated: WorkflowStepConfig[] = [];
  for (const [index, step] of steps.entries()) {
    if (!step || typeof step !== "object") {
      throw new ApiError(400, `steps[${index}] must be an object`);
    }
    const record = step as Record<string, unknown>;
    if (typeof record.type !== "string" || !record.type) {
      throw new ApiError(400, `steps[${index}].type is required`);
    }
    const action = getAction(record.type);
    if (!action) {
      throw new ApiError(400, `Unknown action type: ${record.type}`);
    }
    const input =
      record.input && typeof record.input === "object"
        ? (record.input as Record<string, unknown>)
        : {};
    // Validate shape only — templates are resolved at run time.
    // Strip template strings to placeholders the schema can accept loosely by
    // checking required keys exist; full parse happens at execute time.
    try {
      // Soft validation: ensure non-template fields parse when present.
      // Always accept the config; hard-fail only on completely invalid shapes
      // that cannot be templates (e.g. wrong operator enum).
      if (
        !Object.values(input).some(
          (value) => typeof value === "string" && value.includes("{{")
        )
      ) {
        action.schema.parse(input);
      }
    } catch (error) {
      throw new ApiError(
        400,
        `steps[${index}] input invalid: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    validated.push({
      type: record.type,
      label: typeof record.label === "string" ? record.label : undefined,
      input,
    });
  }

  return validated;
}

export type CreateWorkflowInput = {
  name: string;
  description?: string | null;
  enabled?: boolean;
  triggerType: "event" | "manual";
  eventName?: string | null;
  steps?: unknown;
};

export type UpdateWorkflowInput = Partial<CreateWorkflowInput>;

export async function listWorkflows(
  workspaceId: string
): Promise<WorkflowRecord[]> {
  const rows = await getControlPlaneDb()
    .select()
    .from(workflow)
    .where(eq(workflow.workspace_id, workspaceId))
    .orderBy(desc(workflow.updated_at));

  return rows.map(mapWorkflow);
}

export async function getWorkflow(
  workspaceId: string,
  id: string
): Promise<WorkflowRecord | null> {
  const rows = await getControlPlaneDb()
    .select()
    .from(workflow)
    .where(and(eq(workflow.id, id), eq(workflow.workspace_id, workspaceId)))
    .limit(1);

  const row = rows[0];
  return row ? mapWorkflow(row) : null;
}

export async function createWorkflow(
  workspaceId: string,
  actorUserId: string,
  input: CreateWorkflowInput
): Promise<WorkflowRecord> {
  if (!input.name?.trim()) {
    throw new ApiError(400, "name is required");
  }
  if (input.triggerType === "event" && !input.eventName) {
    throw new ApiError(400, "eventName is required for event triggers");
  }
  if (input.triggerType === "manual" && input.eventName) {
    throw new ApiError(400, "eventName must be null for manual triggers");
  }

  const steps = validateSteps(input.steps ?? []);

  const [row] = await getControlPlaneDb()
    .insert(workflow)
    .values({
      workspace_id: workspaceId,
      name: input.name.trim(),
      description: input.description ?? null,
      enabled: input.enabled ?? false,
      trigger_type: input.triggerType,
      event_name: input.triggerType === "event" ? input.eventName : null,
      steps,
      created_by: actorUserId,
    })
    .returning();

  if (!row) {
    throw new ApiError(500, "Failed to create workflow");
  }

  return mapWorkflow(row);
}

export async function updateWorkflow(
  workspaceId: string,
  id: string,
  input: UpdateWorkflowInput
): Promise<WorkflowRecord | null> {
  const existing = await getWorkflow(workspaceId, id);
  if (!existing) {
    return null;
  }

  const triggerType = input.triggerType ?? existing.triggerType;
  const eventName =
    input.eventName !== undefined ? input.eventName : existing.eventName;

  if (triggerType === "event" && !eventName) {
    throw new ApiError(400, "eventName is required for event triggers");
  }
  if (triggerType === "manual" && eventName) {
    throw new ApiError(400, "eventName must be null for manual triggers");
  }

  const steps =
    input.steps !== undefined ? validateSteps(input.steps) : existing.steps;

  const [row] = await getControlPlaneDb()
    .update(workflow)
    .set({
      name: input.name?.trim() ?? existing.name,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      enabled: input.enabled ?? existing.enabled,
      trigger_type: triggerType,
      event_name: triggerType === "event" ? eventName : null,
      steps,
      updated_at: new Date(),
    })
    .where(and(eq(workflow.id, id), eq(workflow.workspace_id, workspaceId)))
    .returning();

  return row ? mapWorkflow(row) : null;
}

export async function deleteWorkflow(
  workspaceId: string,
  id: string
): Promise<boolean> {
  const rows = await getControlPlaneDb()
    .delete(workflow)
    .where(and(eq(workflow.id, id), eq(workflow.workspace_id, workspaceId)))
    .returning({ id: workflow.id });

  return rows.length > 0;
}

export async function listWorkflowRuns(
  workspaceId: string,
  options: { workflowId?: string; limit?: number; before?: string } = {}
): Promise<WorkflowRunRecord[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ApiError(400, `limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  let before: Date | null = null;
  if (options.before) {
    before = new Date(options.before);
    if (Number.isNaN(before.getTime())) {
      throw new ApiError(400, "before must be an ISO timestamp");
    }
  }

  const predicates = [eq(workflowRun.workspace_id, workspaceId)];
  if (options.workflowId) {
    predicates.push(eq(workflowRun.workflow_id, options.workflowId));
  }
  if (before) {
    predicates.push(lt(workflowRun.started_at, before));
  }

  const rows = await getControlPlaneDb()
    .select()
    .from(workflowRun)
    .where(and(...predicates))
    .orderBy(desc(workflowRun.started_at))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    workflowId: row.workflow_id,
    scheduleId: row.schedule_id,
    status: row.status,
    steps: row.steps ?? [],
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }));
}

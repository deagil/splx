import type { z } from "zod";
import type { TenantContext } from "@/lib/server/tenant/context";

export interface ActionContext {
  requestId?: string | null;
  /** Full run context for template resolution (event, steps, …). */
  runContext: Record<string, unknown>;
  /** The workflow_runs.id currently executing — threaded into emitEvent. */
  runId: string;
  tenant: TenantContext;
  workspaceId: string;
}

export interface ActionResult {
  output: Record<string, unknown>;
  /** When true, remaining steps are skipped and the run succeeds. */
  stop?: boolean;
}

export interface WorkflowAction<TInput extends z.ZodType = z.ZodType> {
  execute: (
    input: z.infer<TInput>,
    context: ActionContext
  ) => Promise<ActionResult>;
  schema: TInput;
  type: string;
}

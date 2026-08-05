import type { TenantContext } from "@/lib/server/tenant/context";
import type { z } from "zod";

export type ActionContext = {
  tenant: TenantContext;
  workspaceId: string;
  requestId?: string | null;
  /** The workflow_runs.id currently executing — threaded into emitEvent. */
  runId: string;
  /** Full run context for template resolution (event, steps, …). */
  runContext: Record<string, unknown>;
};

export type ActionResult = {
  output: Record<string, unknown>;
  /** When true, remaining steps are skipped and the run succeeds. */
  stop?: boolean;
};

export type WorkflowAction<TInput extends z.ZodType = z.ZodType> = {
  type: string;
  schema: TInput;
  execute: (
    input: z.infer<TInput>,
    context: ActionContext
  ) => Promise<ActionResult>;
};

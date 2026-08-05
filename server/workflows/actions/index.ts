import { assertPublicUrl } from "@/server/lib/safe-url";
import { conditionAction } from "./condition";
import { httpAction } from "./http";
import { rowAction } from "./row";
import type { WorkflowAction } from "./types";

const actions: WorkflowAction[] = [rowAction, httpAction, conditionAction];

const byType = new Map(actions.map((action) => [action.type, action]));

export function getAction(type: string): WorkflowAction | undefined {
  return byType.get(type);
}

export function listActions(): WorkflowAction[] {
  return [...actions];
}

export { conditionInputSchema, evaluateCondition } from "./condition";
export { httpInputSchema } from "./http";
export { rowInputSchema } from "./row";
export type { ActionContext, ActionResult, WorkflowAction } from "./types";
export { assertPublicUrl };

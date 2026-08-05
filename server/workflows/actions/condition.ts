import { z } from "zod";
import type { WorkflowAction } from "./types";

const operators = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "contains",
  "not_contains",
  "is_null",
  "is_not_null",
] as const;

export type ConditionOperator = (typeof operators)[number];

export const conditionInputSchema = z.object({
  left: z.unknown(),
  operator: z.enum(operators),
  right: z.unknown().optional(),
});

export type ConditionInput = z.infer<typeof conditionInputSchema>;

export function evaluateCondition(input: ConditionInput): boolean {
  const { left, operator, right } = input;

  switch (operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "greater_than":
      return Number(left) > Number(right);
    case "less_than":
      return Number(left) < Number(right);
    case "contains":
      return String(left ?? "").includes(String(right ?? ""));
    case "not_contains":
      return !String(left ?? "").includes(String(right ?? ""));
    case "is_null":
      return left === null || left === undefined;
    case "is_not_null":
      return left !== null && left !== undefined;
    default: {
      const _exhaustive: never = operator;
      return _exhaustive;
    }
  }
}

export const conditionAction: WorkflowAction<typeof conditionInputSchema> = {
  async execute(input) {
    const result = evaluateCondition(input);
    return {
      output: {
        evaluated: {
          left: input.left,
          operator: input.operator,
          right: input.right ?? null,
        },
        result,
      },
      stop: !result,
    };
  },
  schema: conditionInputSchema,
  type: "condition",
};

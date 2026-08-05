import { z } from "zod";
import { dataRepository } from "@/server/repositories/data";
import type { WorkflowAction } from "./types";

export const rowInputSchema = z.discriminatedUnion("operation", [
  z.object({
    data: z.record(z.string(), z.unknown()),
    operation: z.literal("create"),
    tableId: z.string().min(1),
  }),
  z.object({
    data: z.record(z.string(), z.unknown()),
    operation: z.literal("update"),
    recordId: z.string().min(1),
    tableId: z.string().min(1),
  }),
  z.object({
    operation: z.literal("delete"),
    recordId: z.string().min(1),
    tableId: z.string().min(1),
  }),
]);

export type RowInput = z.infer<typeof rowInputSchema>;

export const rowAction: WorkflowAction<typeof rowInputSchema> = {
  async execute(input, context) {
    const repo = dataRepository({
      causedByRunId: context.runId,
      requestId: context.requestId ?? undefined,
      tenant: context.tenant,
    });

    if (input.operation === "create") {
      const record = await repo.create(input.tableId, input.data);
      return { output: { operation: "create", record } };
    }

    if (input.operation === "update") {
      const record = await repo.update(
        input.tableId,
        input.recordId,
        input.data
      );
      if (!record) {
        throw new Error(`Record not found: ${input.recordId}`);
      }
      return { output: { operation: "update", record } };
    }

    const deleted = await repo.remove(input.tableId, input.recordId);
    if (!deleted) {
      throw new Error(`Record not found: ${input.recordId}`);
    }
    return {
      output: { deleted: true, operation: "delete", recordId: input.recordId },
    };
  },
  schema: rowInputSchema,
  type: "row",
};

import { z } from "zod";
import { dataRepository } from "@/server/repositories/data";
import type { WorkflowAction } from "./types";

export const rowInputSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    tableId: z.string().min(1),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    operation: z.literal("update"),
    tableId: z.string().min(1),
    recordId: z.string().min(1),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    operation: z.literal("delete"),
    tableId: z.string().min(1),
    recordId: z.string().min(1),
  }),
]);

export type RowInput = z.infer<typeof rowInputSchema>;

export const rowAction: WorkflowAction<typeof rowInputSchema> = {
  type: "row",
  schema: rowInputSchema,
  async execute(input, context) {
    const repo = dataRepository({
      tenant: context.tenant,
      requestId: context.requestId ?? undefined,
      causedByRunId: context.runId,
    });

    if (input.operation === "create") {
      const record = await repo.create(input.tableId, input.data);
      return { output: { record, operation: "create" } };
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
      return { output: { record, operation: "update" } };
    }

    const deleted = await repo.remove(input.tableId, input.recordId);
    if (!deleted) {
      throw new Error(`Record not found: ${input.recordId}`);
    }
    return {
      output: { deleted: true, recordId: input.recordId, operation: "delete" },
    };
  },
};

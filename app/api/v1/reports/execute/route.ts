import { z } from "zod";
import { runReportQuery } from "@/lib/server/reports/run-query";
import { endpoint } from "@/server/api/endpoint";

const executeSchema = z.object({
  sql: z.string().min(1, "SQL query is required"),
});

/**
 * Runs a saved report query. `runReportQuery` rejects anything that is not a
 * bare SELECT and caps the row count; this route only adds auth, the permission
 * gate, and consistent error mapping.
 */
export const POST = endpoint<z.infer<typeof executeSchema>>({
  auth: "required",
  permission: "reports.view",
  schema: executeSchema,
  async handler({ user, body }) {
    const data = await runReportQuery(user.tenant, body.sql);
    return { data: { data } };
  },
});

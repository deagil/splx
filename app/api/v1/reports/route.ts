import { z } from "zod";
import { createReport, listReports } from "@/lib/server/reports";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";

const createReportSchema = z.record(z.string(), z.unknown());

/**
 * Gated on `reports.*` rather than the `tables.*` these routes previously used.
 * `role_permissions` has always seeded reports.view / reports.edit; the routes
 * just never asked for them.
 */
export const GET = endpoint({
  auth: "required",
  permission: "reports.view",
  async handler({ user }) {
    const reports = await listReports(user.tenant);
    return { data: { reports } };
  },
});

export const POST = endpoint<Record<string, unknown>>({
  auth: "required",
  permission: "reports.edit",
  schema: createReportSchema,
  async handler({ user, body, requestId }) {
    const report = await createReport(user.tenant, body);

    await writeAuditLog({
      workspaceId: user.workspaceId,
      actorUserId: user.userId,
      action: "reports.created",
      resourceType: "report",
      resourceId: (report as { id?: string }).id ?? null,
      changes: body,
      requestId,
    });

    return { data: { report }, status: 201 };
  },
});

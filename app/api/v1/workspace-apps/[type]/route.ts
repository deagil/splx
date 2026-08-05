import { z } from "zod";
import {
  getWorkspaceAppSummary,
  saveOpenAiWorkspaceApp,
  savePostgresWorkspaceApp,
  workspaceAppTypeSchema,
} from "@/lib/server/workspace-apps";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";

interface Params {
  type: string;
}

const bodySchema = z.record(z.string(), z.unknown());

/**
 * External database / provider connections for the workspace.
 *
 * `workspace.manage` was gated on here but granted by nothing, so every
 * non-admin got a 403 (admin passed only via the `*` wildcard). It is now
 * seeded for admin — see the Phase 2 migration.
 */
export const GET = endpoint<undefined, Params>({
  auth: "required",
  async handler({ user, params }) {
    const type = workspaceAppTypeSchema.parse(params.type);
    const app = await getWorkspaceAppSummary(user.tenant, type);
    return { data: { app } };
  },
  permission: "workspace.manage",
});

export const POST = endpoint<Record<string, unknown>, Params>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const type = workspaceAppTypeSchema.parse(params.type);

    const app =
      type === "postgres"
        ? await savePostgresWorkspaceApp(user.tenant, body)
        : await saveOpenAiWorkspaceApp(user.tenant, body);

    // Deliberately does not record the payload: it carries connection strings
    // and API keys.
    await writeAuditLog({
      action: "workspace.app_configured",
      actorUserId: user.userId,
      requestId,
      resourceId: type,
      resourceType: "workspace_app",
      workspaceId: user.workspaceId,
    });

    return { data: { app } };
  },
  permission: "workspace.manage",
  schema: bodySchema,
});

import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { writeAuditLog } from "@/server/lib/audit";
import {
  getEmailSettings,
  upsertEmailSettings,
} from "@/server/repositories/email-templates";

const updateSchema = z.object({
  fromEmail: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  fromName: z.string().nullable().optional(),
  replyTo: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
});

export const GET = endpoint({
  auth: "required",
  async handler({ user }) {
    const settings = await getEmailSettings(user.workspaceId);
    return { data: { settings } };
  },
  permission: "comms.view",
});

export const PUT = endpoint<z.infer<typeof updateSchema>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    const existing = await getEmailSettings(user.workspaceId);
    const settings = await upsertEmailSettings(user.workspaceId, {
      fromEmail:
        body.fromEmail === undefined
          ? existing.fromEmail
          : body.fromEmail || null,
      fromName: body.fromName === undefined ? existing.fromName : body.fromName,
      replyTo:
        body.replyTo === undefined ? existing.replyTo : body.replyTo || null,
    });

    await writeAuditLog({
      action: "comms.settings.updated",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: user.workspaceId,
      resourceType: "email_settings",
      workspaceId: user.workspaceId,
    });

    return { data: { settings } };
  },
  permission: "comms.edit",
  schema: updateSchema,
});

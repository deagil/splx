import { z } from "zod";
import { resolveSampleValues } from "@/lib/comms/sample-values";
import { resolveTemplateVariables } from "@/lib/comms/variables";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { getEmailProvider } from "@/server/comms/provider";
import { renderEmailTemplate } from "@/server/comms/render";
import { writeAuditLog } from "@/server/lib/audit";
import {
  createEmailSend,
  formatFromAddress,
  getEmailSettings,
  getEmailTemplate,
} from "@/server/repositories/email-templates";

const testSendSchema = z.object({
  to: z.string().email(),
  /** Overrides the template's stored sample data; falls back to it when empty. */
  values: z.record(z.string(), z.unknown()).optional(),
});

export const POST = endpoint<
  z.infer<typeof testSendSchema>,
  { templateId: string }
>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const template = await getEmailTemplate(
      user.workspaceId,
      params.templateId
    );
    if (!template) {
      throw new ApiError(404, "Email template not found");
    }

    const settings = await getEmailSettings(user.workspaceId);
    const from = formatFromAddress(settings);

    let values: Record<string, unknown>;
    try {
      values = resolveTemplateVariables(template.variables, {
        ...resolveSampleValues(template.variables, template.sampleData),
        ...body.values,
      });
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "Invalid template values"
      );
    }

    const rendered = await renderEmailTemplate({
      blocks: template.blocks,
      previewText: template.previewText,
      subject: template.subject,
      values,
    });

    try {
      const result = await getEmailProvider().send({
        from,
        html: rendered.html,
        replyTo: settings.replyTo ?? undefined,
        subject: `[Test] ${rendered.subject}`,
        text: rendered.text,
        to: body.to,
      });

      const send = await createEmailSend({
        providerMessageId: result.messageId,
        status: "sent",
        subject: `[Test] ${rendered.subject}`,
        templateId: template.id,
        to: body.to,
        variables: values,
        workspaceId: user.workspaceId,
      });

      await writeAuditLog({
        action: "comms.template.test_sent",
        actorUserId: user.userId,
        changes: { to: body.to },
        requestId,
        resourceId: template.id,
        resourceType: "email_template",
        workspaceId: user.workspaceId,
      });

      return { data: { send } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send email";
      await createEmailSend({
        error: message,
        status: "failed",
        subject: `[Test] ${rendered.subject}`,
        templateId: template.id,
        to: body.to,
        variables: values,
        workspaceId: user.workspaceId,
      });
      throw new ApiError(502, message);
    }
  },
  permission: "comms.edit",
  schema: testSendSchema,
});

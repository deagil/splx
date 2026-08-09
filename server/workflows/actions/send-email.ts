import { z } from "zod";
import { resolveTemplateVariables } from "@/lib/comms/variables";
import { getEmailProvider } from "@/server/comms/provider";
import { renderEmailTemplate } from "@/server/comms/render";
import {
  createEmailSend,
  formatFromAddress,
  getEmailSettings,
  getEmailTemplate,
} from "@/server/repositories/email-templates";
import type { WorkflowAction } from "./types";

export const sendEmailInputSchema = z.object({
  mapping: z.record(z.string(), z.unknown()).default({}),
  replyTo: z.string().optional(),
  templateId: z.string().uuid(),
  to: z.string().min(1),
});

export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;

export const sendEmailAction: WorkflowAction<typeof sendEmailInputSchema> = {
  async execute(input, context) {
    const template = await getEmailTemplate(
      context.workspaceId,
      input.templateId
    );
    if (!template) {
      throw new Error(`Email template not found: ${input.templateId}`);
    }
    if (template.status !== "active") {
      throw new Error(
        `Email template "${template.name}" is not active (status: ${template.status})`
      );
    }

    const settings = await getEmailSettings(context.workspaceId);
    let from: string;
    try {
      from = formatFromAddress(settings);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Email settings incomplete"
      );
    }

    let values: Record<string, unknown>;
    try {
      values = resolveTemplateVariables(template.variables, input.mapping);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Invalid variable mapping"
      );
    }

    const rendered = await renderEmailTemplate({
      blocks: template.blocks,
      previewText: template.previewText,
      subject: template.subject,
      values,
    });

    const replyTo = input.replyTo ?? settings.replyTo ?? undefined;

    try {
      const result = await getEmailProvider().send({
        from,
        html: rendered.html,
        replyTo,
        subject: rendered.subject,
        text: rendered.text,
        to: input.to,
      });

      const send = await createEmailSend({
        providerMessageId: result.messageId,
        status: "sent",
        subject: rendered.subject,
        templateId: template.id,
        to: input.to,
        variables: values,
        workflowRunId: context.runId,
        workspaceId: context.workspaceId,
      });

      return {
        output: {
          providerMessageId: result.messageId,
          sendId: send.id,
          status: "sent",
          subject: rendered.subject,
          to: input.to,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send email";
      await createEmailSend({
        error: message,
        status: "failed",
        subject: rendered.subject,
        templateId: template.id,
        to: input.to,
        variables: values,
        workflowRunId: context.runId,
        workspaceId: context.workspaceId,
      });
      throw new Error(message);
    }
  },
  schema: sendEmailInputSchema,
  type: "send_email",
};

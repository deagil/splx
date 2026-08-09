import { z } from "zod";
import { EMAIL_VARIABLE_TYPES } from "@/lib/comms/types";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import {
  deleteEmailTemplate,
  getEmailTemplate,
  updateEmailTemplate,
} from "@/server/repositories/email-templates";

const variableSchema = z.object({
  description: z.string().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
  type: z.enum(EMAIL_VARIABLE_TYPES),
});

const blockSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum([
      "header",
      "heading",
      "text",
      "button",
      "image",
      "divider",
      "spacer",
      "footer",
    ]),
  })
  .passthrough();

const updateSchema = z.object({
  blocks: z.array(blockSchema).optional(),
  description: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  previewText: z.string().nullable().optional(),
  sampleData: z.record(z.string(), z.string()).optional(),
  slug: z.string().optional(),
  status: z.enum(["draft", "active"]).optional(),
  subject: z.string().optional(),
  variables: z.array(variableSchema).optional(),
});

export const GET = endpoint<undefined, { templateId: string }>({
  auth: "required",
  async handler({ user, params }) {
    const template = await getEmailTemplate(
      user.workspaceId,
      params.templateId
    );
    if (!template) {
      throw new ApiError(404, "Email template not found");
    }
    return { data: { template } };
  },
  permission: "comms.view",
});

export const PATCH = endpoint<
  z.infer<typeof updateSchema>,
  { templateId: string }
>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const template = await updateEmailTemplate(
      user.workspaceId,
      params.templateId,
      {
        blocks: body.blocks as Parameters<
          typeof updateEmailTemplate
        >[2]["blocks"],
        description: body.description,
        name: body.name,
        previewText: body.previewText,
        sampleData: body.sampleData,
        slug: body.slug,
        status: body.status,
        subject: body.subject,
        variables: body.variables,
      }
    );
    if (!template) {
      throw new ApiError(404, "Email template not found");
    }

    await writeAuditLog({
      action: "comms.template.updated",
      actorUserId: user.userId,
      changes: body,
      requestId,
      resourceId: template.id,
      resourceType: "email_template",
      workspaceId: user.workspaceId,
    });

    return { data: { template } };
  },
  permission: "comms.edit",
  schema: updateSchema,
});

export const DELETE = endpoint<undefined, { templateId: string }>({
  auth: "required",
  async handler({ user, params, requestId }) {
    const deleted = await deleteEmailTemplate(
      user.workspaceId,
      params.templateId
    );
    if (!deleted) {
      throw new ApiError(404, "Email template not found");
    }

    await writeAuditLog({
      action: "comms.template.deleted",
      actorUserId: user.userId,
      changes: {},
      requestId,
      resourceId: params.templateId,
      resourceType: "email_template",
      workspaceId: user.workspaceId,
    });

    return { data: { success: true } };
  },
  permission: "comms.edit",
});

import { z } from "zod";
import { cloneStarter, getEmailStarter } from "@/lib/comms/starters";
import { EMAIL_VARIABLE_TYPES, type EmailBlock } from "@/lib/comms/types";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import {
  createEmailTemplate,
  listEmailTemplates,
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

const createSchema = z.object({
  blocks: z.array(blockSchema).optional(),
  description: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  previewText: z.string().nullable().optional(),
  sampleData: z.record(z.string(), z.string()).optional(),
  slug: z.string().optional(),
  starterId: z.enum(["welcome", "order-received", "notification"]).optional(),
  status: z.enum(["draft", "active"]).optional(),
  subject: z.string().optional(),
  variables: z.array(variableSchema).optional(),
});

export const GET = endpoint({
  auth: "required",
  async handler({ user, query }) {
    const status = query.get("status");
    const templates = await listEmailTemplates(
      user.workspaceId,
      status === "draft" || status === "active" ? { status } : undefined
    );
    return { data: { templates } };
  },
  permission: "comms.view",
});

export const POST = endpoint<z.infer<typeof createSchema>>({
  auth: "required",
  async handler({ user, body, requestId }) {
    let payload: {
      blocks?: EmailBlock[];
      description?: string | null;
      name: string;
      previewText?: string | null;
      sampleData?: Record<string, string>;
      slug?: string;
      status?: "draft" | "active";
      subject?: string;
      variables?: z.infer<typeof variableSchema>[];
    } = {
      blocks: body.blocks as EmailBlock[] | undefined,
      description: body.description,
      name: body.name ?? "Untitled template",
      previewText: body.previewText,
      sampleData: body.sampleData,
      slug: body.slug,
      status: body.status,
      subject: body.subject,
      variables: body.variables,
    };

    if (body.starterId) {
      const starter = getEmailStarter(body.starterId);
      if (!starter) {
        throw new ApiError(400, `Unknown starter: ${body.starterId}`);
      }
      const cloned = cloneStarter(starter);
      payload = {
        blocks: cloned.blocks,
        description: body.description ?? cloned.description,
        name: body.name ?? cloned.name,
        previewText: body.previewText ?? cloned.previewText,
        sampleData: body.sampleData,
        slug: body.slug ?? cloned.slug,
        status: body.status ?? "draft",
        subject: body.subject ?? cloned.subject,
        variables: body.variables ?? cloned.variables,
      };
    }

    const created = await createEmailTemplate(
      user.workspaceId,
      user.userId,
      payload
    );

    await writeAuditLog({
      action: "comms.template.created",
      actorUserId: user.userId,
      changes: { name: created.name, slug: created.slug },
      requestId,
      resourceId: created.id,
      resourceType: "email_template",
      workspaceId: user.workspaceId,
    });

    return { data: { template: created }, status: 201 };
  },
  permission: "comms.edit",
  schema: createSchema,
});

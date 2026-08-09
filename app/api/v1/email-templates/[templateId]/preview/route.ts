import { z } from "zod";
import { resolveSampleValues } from "@/lib/comms/sample-values";
import type { EmailBlock } from "@/lib/comms/types";
import { resolveTemplateVariables } from "@/lib/comms/variables";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { renderEmailTemplate } from "@/server/comms/render";
import { getEmailTemplate } from "@/server/repositories/email-templates";

const previewSchema = z.object({
  /** Optional draft overrides for live preview while editing. */
  blocks: z.array(z.record(z.string(), z.unknown())).optional(),
  previewText: z.string().nullable().optional(),
  subject: z.string().optional(),
  /** Overrides the template's stored sample data; falls back to it when empty. */
  values: z.record(z.string(), z.unknown()).optional(),
  variables: z
    .array(
      z.object({
        description: z.string().optional(),
        key: z.string(),
        label: z.string(),
        required: z.boolean(),
        type: z.enum(["string", "number", "boolean", "date", "email", "url"]),
      })
    )
    .optional(),
});

export const POST = endpoint<
  z.infer<typeof previewSchema>,
  { templateId: string }
>({
  auth: "required",
  async handler({ user, params, body }) {
    const template = await getEmailTemplate(
      user.workspaceId,
      params.templateId
    );
    if (!template) {
      throw new ApiError(404, "Email template not found");
    }

    const variables = body.variables ?? template.variables;
    const blocks = (body.blocks as EmailBlock[] | undefined) ?? template.blocks;
    const subject = body.subject ?? template.subject;
    const previewText =
      body.previewText === undefined ? template.previewText : body.previewText;

    // Type-derived placeholders under the author's stored sample data, under any
    // draft values the editor sent. Same layering the canvas preview uses, so
    // the two previews cannot disagree.
    const supplied = {
      ...resolveSampleValues(variables, template.sampleData),
      ...body.values,
    };

    let values: Record<string, unknown>;
    try {
      values = resolveTemplateVariables(variables, supplied);
    } catch {
      // A preview must always render. Fill gaps with a labelled placeholder
      // rather than failing the way a real send would.
      values = { ...supplied };
      for (const variable of variables) {
        if (!(variable.key in values) || values[variable.key] === "") {
          values[variable.key] = `[${variable.label}]`;
        }
      }
    }

    const rendered = await renderEmailTemplate({
      blocks,
      previewText,
      subject,
      values,
    });

    return { data: { rendered } };
  },
  permission: "comms.view",
  schema: previewSchema,
});

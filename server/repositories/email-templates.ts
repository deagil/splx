import { and, asc, desc, eq } from "drizzle-orm";
import type {
  EmailBlock,
  EmailTemplateStatus,
  EmailTemplateVariable,
} from "@/lib/comms/types";
import {
  type EmailSendStatus,
  emailSend,
  emailSettings,
  emailTemplate,
} from "@/lib/db/schema";
import { ApiError } from "@/server/api/responses";
import { getControlPlaneDb } from "@/server/lib/db";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VARIABLE_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_.]*$/;

export interface EmailTemplateRecord {
  blocks: EmailBlock[];
  createdAt: Date;
  createdBy: string | null;
  description: string | null;
  id: string;
  name: string;
  previewText: string | null;
  sampleData: Record<string, string>;
  slug: string;
  status: EmailTemplateStatus;
  subject: string;
  updatedAt: Date;
  variables: EmailTemplateVariable[];
  workspaceId: string;
}

export interface EmailSettingsRecord {
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  updatedAt: Date;
  workspaceId: string;
}

export interface EmailSendRecord {
  createdAt: Date;
  error: string | null;
  id: string;
  providerMessageId: string | null;
  status: EmailSendStatus;
  subject: string;
  templateId: string | null;
  to: string;
  variables: Record<string, unknown>;
  workflowRunId: string | null;
  workspaceId: string;
}

function mapTemplate(
  row: typeof emailTemplate.$inferSelect
): EmailTemplateRecord {
  return {
    blocks: (row.blocks ?? []) as EmailBlock[],
    createdAt: row.created_at,
    createdBy: row.created_by,
    description: row.description,
    id: row.id,
    name: row.name,
    previewText: row.preview_text,
    sampleData: (row.sample_data ?? {}) as Record<string, string>,
    slug: row.slug,
    status: row.status as EmailTemplateStatus,
    subject: row.subject,
    updatedAt: row.updated_at,
    variables: (row.variables ?? []) as EmailTemplateVariable[],
    workspaceId: row.workspace_id,
  };
}

function mapSettings(
  row: typeof emailSettings.$inferSelect
): EmailSettingsRecord {
  return {
    fromEmail: row.from_email,
    fromName: row.from_name,
    replyTo: row.reply_to,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}

function mapSend(row: typeof emailSend.$inferSelect): EmailSendRecord {
  return {
    createdAt: row.created_at,
    error: row.error,
    id: row.id,
    providerMessageId: row.provider_message_id,
    status: row.status as EmailSendStatus,
    subject: row.subject,
    templateId: row.template_id,
    to: row.to,
    variables: (row.variables ?? {}) as Record<string, unknown>,
    workflowRunId: row.workflow_run_id,
    workspaceId: row.workspace_id,
  };
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function assertVariables(variables: EmailTemplateVariable[]): void {
  const seen = new Set<string>();
  for (const variable of variables) {
    if (!VARIABLE_KEY_RE.test(variable.key)) {
      throw new ApiError(
        400,
        `Invalid variable key "${variable.key}" — use letters, numbers, dots, underscores`
      );
    }
    if (seen.has(variable.key)) {
      throw new ApiError(400, `Duplicate variable key: ${variable.key}`);
    }
    seen.add(variable.key);
  }
}

export async function listEmailTemplates(
  workspaceId: string,
  options?: { status?: EmailTemplateStatus }
): Promise<EmailTemplateRecord[]> {
  const db = getControlPlaneDb();
  const rows = options?.status
    ? await db
        .select()
        .from(emailTemplate)
        .where(
          and(
            eq(emailTemplate.workspace_id, workspaceId),
            eq(emailTemplate.status, options.status)
          )
        )
        .orderBy(asc(emailTemplate.name))
    : await db
        .select()
        .from(emailTemplate)
        .where(eq(emailTemplate.workspace_id, workspaceId))
        .orderBy(asc(emailTemplate.name));

  return rows.map(mapTemplate);
}

export async function getEmailTemplate(
  workspaceId: string,
  templateId: string
): Promise<EmailTemplateRecord | null> {
  const [row] = await getControlPlaneDb()
    .select()
    .from(emailTemplate)
    .where(
      and(
        eq(emailTemplate.workspace_id, workspaceId),
        eq(emailTemplate.id, templateId)
      )
    )
    .limit(1);

  return row ? mapTemplate(row) : null;
}

export async function createEmailTemplate(
  workspaceId: string,
  actorUserId: string,
  input: {
    blocks?: EmailBlock[];
    description?: string | null;
    name: string;
    previewText?: string | null;
    sampleData?: Record<string, string>;
    slug?: string;
    status?: EmailTemplateStatus;
    subject?: string;
    variables?: EmailTemplateVariable[];
  }
): Promise<EmailTemplateRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new ApiError(400, "name is required");
  }

  const slug = (input.slug?.trim() || slugify(name)).toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new ApiError(
      400,
      "slug must be lowercase letters, numbers, and hyphens"
    );
  }

  const variables = input.variables ?? [];
  assertVariables(variables);

  try {
    const [row] = await getControlPlaneDb()
      .insert(emailTemplate)
      .values({
        blocks: input.blocks ?? [],
        created_by: actorUserId,
        description: input.description ?? null,
        name,
        preview_text: input.previewText ?? null,
        sample_data: input.sampleData ?? {},
        slug,
        status: input.status ?? "draft",
        subject: input.subject ?? "",
        variables,
        workspace_id: workspaceId,
      })
      .returning();

    if (!row) {
      throw new ApiError(500, "Failed to create email template");
    }
    return mapTemplate(row);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      throw new ApiError(409, `Template slug "${slug}" already exists`);
    }
    throw error;
  }
}

export async function updateEmailTemplate(
  workspaceId: string,
  templateId: string,
  input: {
    blocks?: EmailBlock[];
    description?: string | null;
    name?: string;
    previewText?: string | null;
    sampleData?: Record<string, string>;
    slug?: string;
    status?: EmailTemplateStatus;
    subject?: string;
    variables?: EmailTemplateVariable[];
  }
): Promise<EmailTemplateRecord | null> {
  if (input.variables) {
    assertVariables(input.variables);
  }
  if (input.slug !== undefined) {
    const slug = input.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      throw new ApiError(
        400,
        "slug must be lowercase letters, numbers, and hyphens"
      );
    }
  }

  const patch: Partial<typeof emailTemplate.$inferInsert> = {
    updated_at: new Date(),
  };
  if (input.name !== undefined) {
    patch.name = input.name.trim();
  }
  if (input.slug !== undefined) {
    patch.slug = input.slug.trim().toLowerCase();
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }
  if (input.subject !== undefined) {
    patch.subject = input.subject;
  }
  if (input.previewText !== undefined) {
    patch.preview_text = input.previewText;
  }
  if (input.sampleData !== undefined) {
    patch.sample_data = input.sampleData;
  }
  if (input.blocks !== undefined) {
    patch.blocks = input.blocks;
  }
  if (input.variables !== undefined) {
    patch.variables = input.variables;
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }

  try {
    const [row] = await getControlPlaneDb()
      .update(emailTemplate)
      .set(patch)
      .where(
        and(
          eq(emailTemplate.workspace_id, workspaceId),
          eq(emailTemplate.id, templateId)
        )
      )
      .returning();

    return row ? mapTemplate(row) : null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      throw new ApiError(409, "Template slug already exists");
    }
    throw error;
  }
}

export async function deleteEmailTemplate(
  workspaceId: string,
  templateId: string
): Promise<boolean> {
  const deleted = await getControlPlaneDb()
    .delete(emailTemplate)
    .where(
      and(
        eq(emailTemplate.workspace_id, workspaceId),
        eq(emailTemplate.id, templateId)
      )
    )
    .returning({ id: emailTemplate.id });

  return deleted.length > 0;
}

export async function getEmailSettings(
  workspaceId: string
): Promise<EmailSettingsRecord> {
  const [row] = await getControlPlaneDb()
    .select()
    .from(emailSettings)
    .where(eq(emailSettings.workspace_id, workspaceId))
    .limit(1);

  if (row) {
    return mapSettings(row);
  }

  return {
    fromEmail: null,
    fromName: null,
    replyTo: null,
    updatedAt: new Date(0),
    workspaceId,
  };
}

export async function upsertEmailSettings(
  workspaceId: string,
  input: {
    fromEmail?: string | null;
    fromName?: string | null;
    replyTo?: string | null;
  }
): Promise<EmailSettingsRecord> {
  const [row] = await getControlPlaneDb()
    .insert(emailSettings)
    .values({
      from_email: input.fromEmail ?? null,
      from_name: input.fromName ?? null,
      reply_to: input.replyTo ?? null,
      updated_at: new Date(),
      workspace_id: workspaceId,
    })
    .onConflictDoUpdate({
      set: {
        from_email: input.fromEmail ?? null,
        from_name: input.fromName ?? null,
        reply_to: input.replyTo ?? null,
        updated_at: new Date(),
      },
      target: emailSettings.workspace_id,
    })
    .returning();

  if (!row) {
    throw new ApiError(500, "Failed to save email settings");
  }
  return mapSettings(row);
}

export function formatFromAddress(settings: EmailSettingsRecord): string {
  if (!settings.fromEmail) {
    throw new ApiError(
      400,
      "Configure a from email address in Workspace Settings → Email before sending"
    );
  }
  if (settings.fromName?.trim()) {
    return `${settings.fromName.trim()} <${settings.fromEmail.trim()}>`;
  }
  return settings.fromEmail.trim();
}

export async function createEmailSend(input: {
  error?: string | null;
  providerMessageId?: string | null;
  status: EmailSendStatus;
  subject: string;
  templateId: string | null;
  to: string;
  variables?: Record<string, unknown>;
  workflowRunId?: string | null;
  workspaceId: string;
}): Promise<EmailSendRecord> {
  const [row] = await getControlPlaneDb()
    .insert(emailSend)
    .values({
      error: input.error ?? null,
      provider_message_id: input.providerMessageId ?? null,
      status: input.status,
      subject: input.subject,
      template_id: input.templateId,
      to: input.to,
      variables: input.variables ?? {},
      workflow_run_id: input.workflowRunId ?? null,
      workspace_id: input.workspaceId,
    })
    .returning();

  if (!row) {
    throw new ApiError(500, "Failed to log email send");
  }
  return mapSend(row);
}

export async function listEmailSends(
  workspaceId: string,
  options?: { limit?: number; templateId?: string }
): Promise<EmailSendRecord[]> {
  const limit = Math.min(options?.limit ?? 50, 200);
  const db = getControlPlaneDb();
  const rows = options?.templateId
    ? await db
        .select()
        .from(emailSend)
        .where(
          and(
            eq(emailSend.workspace_id, workspaceId),
            eq(emailSend.template_id, options.templateId)
          )
        )
        .orderBy(desc(emailSend.created_at))
        .limit(limit)
    : await db
        .select()
        .from(emailSend)
        .where(eq(emailSend.workspace_id, workspaceId))
        .orderBy(desc(emailSend.created_at))
        .limit(limit);

  return rows.map(mapSend);
}

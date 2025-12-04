import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/server/tenant/context";
import {
  createPageSchema,
  pageIdSchema,
  pageRecordSchema,
  updatePageSchema,
  type PageRecord,
  type UpdatePageInput,
} from "./schema";

export class PageNotFoundError extends Error {
  constructor(message = "Page not found") {
    super(message);
    this.name = "PageNotFoundError";
  }
}

type RawPageRow = Record<string, unknown>;

async function getSupabaseClient() {
  return createClient();
}

function normalizePageRow(row: RawPageRow): PageRecord {
  const parsed = pageRecordSchema.safeParse({
    ...row,
    blocks: parseJsonValue(row.blocks, []),
    settings: parseJsonValue(row.settings, {}),
    layout: parseJsonValue(row.layout, {}),
    created_at: coerceDateString(row.created_at),
    updated_at: coerceDateString(row.updated_at),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join(", ");
    throw new Error(`Invalid page payload from database: ${issues}`);
  }

  return parsed.data;
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function coerceDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  throw new Error("Expected timestamp string");
}

export async function listPages(
  tenant: TenantContext,
  includeSystem = false
): Promise<PageRecord[]> {
  const supabase = await getSupabaseClient();

  let query = supabase
    .from("pages")
    .select("*")
    .eq("workspace_id", tenant.workspaceId);

  // Filter out system pages unless explicitly requested
  if (!includeSystem) {
    query = query.eq("is_system", false);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pages: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizePageRow(row as RawPageRow));
}

export async function getPageById(
  tenant: TenantContext,
  pageId: string
): Promise<PageRecord | null> {
  const id = pageIdSchema.parse(pageId);
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch page: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return normalizePageRow(data as RawPageRow);
}

export async function createPage(
  tenant: TenantContext,
  payload: unknown
): Promise<PageRecord> {
  const input = createPageSchema.parse(payload);
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("pages")
    .insert({
      id: input.id,
      workspace_id: tenant.workspaceId,
      name: input.name,
      description: input.description ?? null,
      layout: input.layout ?? {},
      blocks: input.blocks ?? [],
      settings: input.settings ?? {},
      created_by: tenant.userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create page: ${error.message}`);
  }

  return normalizePageRow(data as RawPageRow);
}

export async function updatePage(
  tenant: TenantContext,
  pageId: string,
  payload: unknown
): Promise<PageRecord> {
  const id = pageIdSchema.parse(pageId);
  const input: UpdatePageInput = updatePageSchema.parse(payload);
  const targetId = input.id ?? id;

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("pages")
    .update({
      id: targetId,
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description,
      layout: input.layout ?? {},
      blocks: input.blocks ?? [],
      settings: input.settings ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if ("code" in error && error.code === "PGRST116") {
      throw new PageNotFoundError();
    }
    throw new Error(`Failed to update page: ${error.message}`);
  }

  return normalizePageRow(data as RawPageRow);
}

export async function deletePage(
  tenant: TenantContext,
  pageId: string
): Promise<void> {
  const id = pageIdSchema.parse(pageId);
  const supabase = await getSupabaseClient();

  // Check if page is a system page
  const page = await getPageById(tenant, id);
  if (page?.is_system) {
    throw new Error("Cannot delete system pages");
  }

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id)
    .eq("is_system", false); // Extra safety check

  if (error) {
    throw new Error(`Failed to delete page: ${error.message}`);
  }
}

/**
 * Get or create a system page. System pages are workspace-scoped
 * and cannot be edited or deleted by users.
 */
export async function getOrCreateSystemPage(
  tenant: TenantContext,
  pageId: string,
  pageDefinition: {
    name: string;
    description?: string;
    blocks: unknown[];
    settings?: Record<string, unknown>;
    layout?: Record<string, unknown>;
  }
): Promise<PageRecord> {
  const id = pageIdSchema.parse(pageId);
  const supabase = await getSupabaseClient();

  // Try to get existing system page
  const { data: existing } = await supabase
    .from("pages")
    .select("*")
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id)
    .eq("is_system", true)
    .maybeSingle();

  if (existing) {
    return normalizePageRow(existing as RawPageRow);
  }

  // Create system page
  const { data, error } = await supabase
    .from("pages")
    .insert({
      id,
      workspace_id: tenant.workspaceId,
      name: pageDefinition.name,
      description: pageDefinition.description ?? null,
      layout: pageDefinition.layout ?? {},
      blocks: pageDefinition.blocks,
      settings: pageDefinition.settings ?? {},
      is_system: true,
      created_by: null, // System pages have no creator
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create system page: ${error.message}`);
  }

  return normalizePageRow(data as RawPageRow);
}


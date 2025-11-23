import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/server/tenant/context";
import {
  createTableSchema,
  tableIdSchema,
  tableRecordSchema,
  updateTableSchema,
  type TableRecord,
  type UpdateTableInput,
} from "./schema";

export class TableNotFoundError extends Error {
  constructor(message = "Table not found") {
    super(message);
    this.name = "TableNotFoundError";
  }
}

export class ReservedTableNameError extends Error {
  constructor(tableName: string) {
    super(
      `Table name '${tableName}' is reserved for system use. Please choose a different name.`
    );
    this.name = "ReservedTableNameError";
  }
}

// System table names that are reserved in LOCAL mode
// These tables support the application's functionality
const RESERVED_TABLE_NAMES = new Set([
  // Platform tables
  "users",
  "workspaces",
  "roles",
  "teams",
  "workspace_users",
  "workspace_invites",
  "workspace_apps",
  // Application metadata tables
  "pages",
  "tables",
  "chats",
  "messages",
  "votes",
  "documents",
  "suggestions",
  "streams",
  "ai_skills",
]);

/**
 * Validates that a table name is not reserved in LOCAL mode.
 * In HOSTED mode, users can use any table name since their tables live in a separate database.
 */
function validateTableName(tenant: TenantContext, tableName: string): void {
  if (tenant.mode === "local") {
    const normalizedName = tableName.toLowerCase();
    if (RESERVED_TABLE_NAMES.has(normalizedName)) {
      throw new ReservedTableNameError(tableName);
    }
  }
  // In hosted mode, no validation needed - user tables live in separate database
}

type RawTableRow = Record<string, unknown>;

async function getSupabaseClient() {
  return createClient();
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

function normalizeTableRow(row: RawTableRow): TableRecord {
  const parsed = tableRecordSchema.safeParse({
    ...row,
    config: parseJsonValue(row.config, {}),
    created_at: coerceDateString(row.created_at),
    updated_at: coerceDateString(row.updated_at),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join(", ");
    throw new Error(`Invalid table payload from database: ${issues}`);
  }

  return parsed.data;
}

export async function listTableConfigs(
  tenant: TenantContext
): Promise<TableRecord[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .eq("workspace_id", tenant.workspaceId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tables: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeTableRow(row as RawTableRow));
}

export async function getTableConfig(
  tenant: TenantContext,
  tableId: string
): Promise<TableRecord | null> {
  const id = tableIdSchema.parse(tableId);
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch table: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return normalizeTableRow(data as RawTableRow);
}

export async function createTableConfig(
  tenant: TenantContext,
  payload: unknown
): Promise<TableRecord> {
  const input = createTableSchema.parse(payload);

  // Validate table name is not reserved (only in local mode)
  validateTableName(tenant, input.name);

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("tables")
    .insert({
      id: input.id,
      workspace_id: tenant.workspaceId,
      name: input.name,
      description: input.description ?? null,
      config: input.config ?? {},
      created_by: tenant.userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create table: ${error.message}`);
  }

  return normalizeTableRow(data as RawTableRow);
}

export async function updateTableConfig(
  tenant: TenantContext,
  tableId: string,
  payload: unknown
): Promise<TableRecord> {
  const id = tableIdSchema.parse(tableId);
  const input: UpdateTableInput = updateTableSchema.parse(payload);
  const targetId = input.id ?? id;

  // Validate table name is not reserved if name is being changed (only in local mode)
  if (input.name !== undefined) {
    validateTableName(tenant, input.name);
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("tables")
    .update({
      id: targetId,
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description,
      config: input.config ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if ("code" in error && error.code === "PGRST116") {
      throw new TableNotFoundError();
    }
    throw new Error(`Failed to update table: ${error.message}`);
  }

  return normalizeTableRow(data as RawTableRow);
}

export async function deleteTableConfig(
  tenant: TenantContext,
  tableId: string
): Promise<void> {
  const id = tableIdSchema.parse(tableId);
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id);

  if (error) {
    if ("code" in error && error.code === "PGRST116") {
      throw new TableNotFoundError();
    }
    throw new Error(`Failed to delete table: ${error.message}`);
  }
}


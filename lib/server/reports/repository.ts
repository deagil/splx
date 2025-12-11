import { createClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/lib/server/tenant/context";
import {
  type CreateReportInput,
  createReportSchema,
  reportIdSchema,
  type ReportRecord,
  reportRecordSchema,
} from "./schema";

type RawReportRow = Record<string, unknown>;

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

function normalizeReportRow(row: RawReportRow): ReportRecord {
  const parsed = reportRecordSchema.safeParse({
    ...row,
    chart_config: parseJsonValue(row.chart_config, {}),
    created_at: coerceDateString(row.created_at),
    updated_at: coerceDateString(row.updated_at),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join(", ");
    throw new Error(`Invalid report payload from database: ${issues}`);
  }

  return parsed.data;
}

export async function listReports(
  tenant: TenantContext,
): Promise<ReportRecord[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("workspace_id", tenant.workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeReportRow(row as RawReportRow));
}

export async function getReport(
  tenant: TenantContext,
  reportId: string,
): Promise<ReportRecord | null> {
  const id = reportIdSchema.parse(reportId);
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("workspace_id", tenant.workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch report: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return normalizeReportRow(data as RawReportRow);
}

export async function createReport(
  tenant: TenantContext,
  payload: unknown,
): Promise<ReportRecord> {
  const input: CreateReportInput = createReportSchema.parse(payload);
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      id: input.id,
      workspace_id: tenant.workspaceId,
      title: input.title,
      description: input.description ?? null,
      sql: input.sql,
      chart_type: input.chart_type ?? null,
      chart_config: input.chart_config ?? {},
      created_by: tenant.userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`);
  }

  return normalizeReportRow(data as RawReportRow);
}





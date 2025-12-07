import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import {
  resolveTenantContext,
  type TenantContext,
} from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { createClient } from "@/lib/supabase/server";
import {
  detectTableRelationships,
  detectReverseRelationships,
} from "@/lib/server/tables/relationships";
import type {
  FieldMetadata,
  RelationshipConfig,
  TableConfig,
  TableRecord,
} from "@/lib/server/tables/schema";
import type { DbClient } from "@/lib/server/tenant/context";
import {
  generateListPageBlock,
  generatePageSettings,
} from "@/lib/server/tables/pages/templates";
import { invalidateTableMetadataCache } from "@/lib/server/tables/cache";

type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_unique: boolean;
};

type TableComment = {
  table_name: string;
  description: string | null;
};

/**
 * Introspects columns for a given table from information_schema
 */
async function introspectTableColumns(
  db: DbClient,
  tableName: string
): Promise<FieldMetadata[]> {
  const columns = (await db.execute(sql`
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_schema = 'public'
            AND tc.table_name = ${tableName}
            AND kcu.column_name = c.column_name
        ) THEN true
        ELSE false
      END as is_unique
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = ${tableName}
    ORDER BY c.ordinal_position
  `)) as ColumnInfo[];

  return columns.map((col) => ({
    field_name: col.column_name,
    display_name: col.column_name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    data_type: col.data_type,
    is_required: col.is_nullable === "NO",
    is_unique: col.is_unique,
  }));
}

/**
 * Gets table comments/descriptions from pg_catalog
 */
async function getTableComments(
  db: DbClient,
  tableNames: string[]
): Promise<Map<string, string | null>> {
  if (tableNames.length === 0) {
    return new Map();
  }

  // Build IN clause with proper parameterization
  const placeholders = tableNames.map((_, i) => sql`${tableNames[i]}`);
  const inClause = sql.join(placeholders, sql`, `);

  const comments = (await db.execute(sql`
    SELECT
      c.relname as table_name,
      d.description
    FROM pg_class c
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
    WHERE n.nspname = 'public'
      AND c.relname IN (${inClause})
  `)) as TableComment[];

  return new Map(comments.map((c) => [c.table_name, c.description]));
}

/**
 * Detects primary key column for a table
 */
async function detectPrimaryKey(
  db: DbClient,
  tableName: string
): Promise<string | undefined> {
  const result = (await db.execute(sql`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${tableName}
    LIMIT 1
  `)) as Array<{ column_name: string }>;

  return result[0]?.column_name;
}

/**
 * Ensures a page exists for the given table, creating it if necessary
 */
async function ensureTablePage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenant: TenantContext,
  tableName: string,
  tableConfig: TableConfig,
  description: string | null
): Promise<void> {
  const pageId = tableName; // Use same ID as table

  // Check if page already exists
  const { data: existingPage } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("workspace_id", tenant.workspaceId)
    .maybeSingle();

  // Create a mock TableRecord for the template generator
  const mockTableRecord: TableRecord = {
    id: tableName,
    workspace_id: tenant.workspaceId,
    name: tableName,
    description,
    config: tableConfig,
    created_by: tenant.userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const listBlock = generateListPageBlock(mockTableRecord);
  const pageSettings = generatePageSettings(mockTableRecord, false);

  if (!existingPage) {
    // Create new page with list block
    const { error: pageError } = await supabase.from("pages").insert({
      id: pageId,
      workspace_id: tenant.workspaceId,
      name: tableName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      description: description ?? `List view for ${tableName} table`,
      blocks: [listBlock],
      settings: pageSettings,
      layout: {},
      created_by: tenant.userId,
    });

    if (pageError) {
      console.error(`Failed to create page for table ${tableName}:`, pageError);
    }
  }
  // If page exists, we don't update it to preserve user customizations
}

/**
 * Syncs all data tables from the resource store to the tables config table
 */
export async function POST() {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "tables.edit");

    const store = await getResourceStore(tenant);
    const supabase = await createClient();

    try {
      // Get all tables from resource store
      const tables = await store.withSqlClient(async (db) => {
        const rows = (await db.execute(sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `)) as Array<{ table_name: string }>;

        return rows;
      });

      const tableNames = tables.map((t) => t.table_name);

      // Filter out system tables in LOCAL mode
      const SYSTEM_TABLES = new Set([
        "users",
        "workspaces",
        "roles",
        "teams",
        "workspace_users",
        "workspace_invites",
        "workspace_apps",
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

      const dataTableNames =
        tenant.mode === "local"
          ? tableNames.filter((name) => !SYSTEM_TABLES.has(name.toLowerCase()))
          : tableNames;

      if (dataTableNames.length === 0) {
        return NextResponse.json({
          success: true,
          synced: 0,
          message: "No data tables to sync",
        });
      }

      // Get table comments
      const commentsMap = await store.withSqlClient(async (db) => {
        return getTableComments(db, dataTableNames);
      });

      // Process each table
      const syncResults: Array<{ name: string; success: boolean; error?: string }> = [];

      for (const tableName of dataTableNames) {
        try {
          // Introspect table structure
          const [fieldMetadata, relationships, reverseRelationships, primaryKey] =
            await store.withSqlClient(async (db) => {
              return Promise.all([
                introspectTableColumns(db, tableName),
                detectTableRelationships(db, tableName),
                detectReverseRelationships(db, tableName),
                detectPrimaryKey(db, tableName),
              ]);
            });

          // Combine forward and reverse relationships
          const allRelationships: RelationshipConfig[] = [
            ...relationships,
            ...reverseRelationships,
          ];

          const tableConfig: TableConfig = {
            table_type: "base_table",
            primary_key_column: primaryKey,
            field_metadata: fieldMetadata,
            relationships: allRelationships,
            label_fields: [],
            rls_policy_templates: [],
            rls_policy_groups: [],
            indexes: [],
          };

          const description = commentsMap.get(tableName) ?? null;

          // Generate a workspace-scoped ID for the table
          // Use the table name as-is since it should be unique within the workspace's resource store
          const tableId = tableName;

          // Check if table already exists for this workspace
          const { data: existingTable } = await supabase
            .from("tables")
            .select("id")
            .eq("id", tableId)
            .eq("workspace_id", tenant.workspaceId)
            .maybeSingle();

          if (existingTable) {
            // Update existing table
            const { error: updateError } = await supabase
              .from("tables")
              .update({
                name: tableName,
                description,
                config: tableConfig,
                updated_at: new Date().toISOString(),
              })
              .eq("id", tableId)
              .eq("workspace_id", tenant.workspaceId);

            if (updateError) {
              console.error(
                `Failed to sync table ${tableName}:`,
                updateError.message,
                updateError
              );
              syncResults.push({
                name: tableName,
                success: false,
                error: updateError.message
              });
            } else {
              // Table updated successfully, ensure page exists
              await ensureTablePage(
                supabase,
                tenant,
                tableName,
                tableConfig,
                description
              );
              await invalidateTableMetadataCache(tenant, tableName);
              syncResults.push({ name: tableName, success: true });
            }
          } else {
            // Insert new table
            const { error: insertError } = await supabase
              .from("tables")
              .insert({
                id: tableId,
                workspace_id: tenant.workspaceId,
                name: tableName,
                description,
                config: tableConfig,
                created_by: tenant.userId,
              });

            if (insertError) {
              console.error(
                `Failed to sync table ${tableName}:`,
                insertError.message,
                insertError
              );
              syncResults.push({
                name: tableName,
                success: false,
                error: insertError.message
              });
            } else {
              // Table created successfully, create page
              await ensureTablePage(
                supabase,
                tenant,
                tableName,
                tableConfig,
                description
              );
              await invalidateTableMetadataCache(tenant, tableName);
              syncResults.push({ name: tableName, success: true });
            }
          }
        } catch (error) {
          console.error(`Error processing table ${tableName}:`, error);
          syncResults.push({ name: tableName, success: false });
        }
      }

      const successCount = syncResults.filter((r) => r.success).length;

      return NextResponse.json({
        success: true,
        synced: successCount,
        total: dataTableNames.length,
        results: syncResults,
      });
    } finally {
      await store.dispose();
    }
  } catch (error) {
    console.error("Sync error:", error);

    if (error instanceof Error) {
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

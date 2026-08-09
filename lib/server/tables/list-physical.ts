import { sql } from "drizzle-orm";
import type { DbClient, TenantContext } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { getControlPlaneDb } from "@/server/lib/db";

/**
 * Physical table listing, split by whether a table is part of the system schema
 * or user data.
 *
 * Extracted from `app/api/tables/route.ts` so the route can be a thin
 * `endpoint()` adapter. Behaviour is unchanged, including the local-mode
 * name-based filtering.
 */

export interface PhysicalTable {
  name: string;
  schema: string;
  type: string;
}

export type TableListingType = "data" | "config";

/**
 * Tables that belong to Splx itself rather than to a workspace's data.
 *
 * Only meaningful in local mode, where system and user tables share one
 * database. In hosted mode the resource store contains user data exclusively.
 */
export const SYSTEM_TABLES: ReadonlySet<string> = new Set([
  "users",
  "workspaces",
  "roles",
  "role_permissions",
  "teams",
  "reports",
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
  "audit_logs",
  "event_logs",
  "event_types",
  "workflows",
  "workflow_schedule",
  "workflow_runs",
  "email_templates",
  "email_settings",
  "email_sends",
]);

async function selectBaseTables(db: DbClient): Promise<PhysicalTable[]> {
  const rows = (await db.execute(sql`
    SELECT table_schema, table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)) as Array<{
    table_schema: string;
    table_name: string;
    table_type: string;
  }>;

  return rows.map((row) => ({
    name: row.table_name,
    schema: row.table_schema,
    type: row.table_type,
  }));
}

function isSystemTable(table: PhysicalTable): boolean {
  return SYSTEM_TABLES.has(table.name.toLowerCase());
}

export async function listPhysicalTables(
  tenant: TenantContext,
  type: TableListingType
): Promise<PhysicalTable[]> {
  // Local mode: one database holds both system and user tables, so they are
  // separated by name.
  if (tenant.mode === "local") {
    const store = await getResourceStore(tenant);
    try {
      const tables = await store.withSqlClient(selectBaseTables);
      return tables.filter((table) =>
        type === "data" ? !isSystemTable(table) : isSystemTable(table)
      );
    } finally {
      await store.dispose();
    }
  }

  // Hosted mode, user data: everything in the resource store is user data.
  if (type === "data") {
    const store = await getResourceStore(tenant);
    try {
      return await store.withSqlClient(selectBaseTables);
    } finally {
      await store.dispose();
    }
  }

  // Hosted mode, config: system tables live in the main database.
  const tables = await selectBaseTables(getControlPlaneDb());
  return tables.filter(isSystemTable);
}

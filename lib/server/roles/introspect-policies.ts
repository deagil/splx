import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * RLS Policy introspection utilities
 *
 * These functions query PostgreSQL system catalogs to analyze
 * RLS policies and detect permission gaps.
 */

export type RlsPolicy = {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
};

export type PolicyPermissionRef = {
  tablename: string;
  policyname: string;
  permission: string;
  source: "qual" | "with_check";
};

export type TableRlsStatus = {
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  has_policies: boolean;
  policy_count: number;
};

export type GapAnalysis = {
  missingPermissions: Array<{
    permission: string;
    tablename: string;
    policyname: string;
  }>;
  tablesWithoutPolicies: string[];
  tablesWithoutRls: string[];
  incompleteCrud: Array<{
    resource: string;
    missingActions: string[];
  }>;
};

/**
 * Get all RLS policies in the public schema
 */
export async function getAllPolicies(
  db: PostgresJsDatabase
): Promise<RlsPolicy[]> {
  const result = await db.execute<RlsPolicy>(sql`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);

  // Drizzle with params returns unknown[], we can cast or rely on generic if supported,
  // in postgres-js it returns the array of rows directly.
  return result as unknown as RlsPolicy[];
}

/**
 * Extract permissions referenced in RLS policies via user_has_access() calls
 */
export async function extractPolicyPermissions(
  db: PostgresJsDatabase
): Promise<PolicyPermissionRef[]> {
  // Extract from USING (qual) clauses
  const qualResult = await db.execute<{
    tablename: string;
    policyname: string;
    permission: string;
  }>(sql`
    SELECT DISTINCT
      tablename,
      policyname,
      (regexp_matches(qual::text, 'user_has_access\\([^,]+,\\s*''([^'']+)''', 'g'))[1] as permission
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual::text LIKE '%user_has_access%'
  `);

  // Extract from WITH CHECK clauses
  const withCheckResult = await db.execute<{
    tablename: string;
    policyname: string;
    permission: string;
  }>(sql`
    SELECT DISTINCT
      tablename,
      policyname,
      (regexp_matches(with_check::text, 'user_has_access\\([^,]+,\\s*''([^'']+)''', 'g'))[1] as permission
    FROM pg_policies
    WHERE schemaname = 'public'
      AND with_check::text LIKE '%user_has_access%'
  `);

  const permissions: PolicyPermissionRef[] = [
    ...(qualResult as unknown as any[]).map((r) => ({ ...r, source: "qual" as const })),
    ...(withCheckResult as unknown as any[]).map((r) => ({
      ...r,
      source: "with_check" as const,
    })),
  ];

  return permissions;
}

/**
 * Get RLS status for all tables in public schema
 */
export async function getTableRlsStatus(
  db: PostgresJsDatabase
): Promise<TableRlsStatus[]> {
  const result = await db.execute<TableRlsStatus>(sql`
    SELECT
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced,
      EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.tablename = c.relname AND p.schemaname = n.nspname
      ) as has_policies,
      COALESCE((
        SELECT COUNT(*) FROM pg_policies p
        WHERE p.tablename = c.relname AND p.schemaname = n.nspname
      ), 0)::int as policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  return result as unknown as TableRlsStatus[];
}

/**
 * Get tables with RLS enabled but no policies defined
 */
export async function getTablesWithoutPolicies(
  db: PostgresJsDatabase
): Promise<string[]> {
  const result = await db.execute<{ table_name: string }>(sql`
    SELECT c.relname as table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.tablename = c.relname AND p.schemaname = n.nspname
      )
    ORDER BY c.relname
  `);

  return (result as unknown as { table_name: string }[]).map((r) => r.table_name);
}

/**
 * Get tables without RLS enabled (potential security risk)
 */
export async function getTablesWithoutRls(
  db: PostgresJsDatabase
): Promise<string[]> {
  // System tables that don't need RLS
  const systemTables = [
    "schema_migrations",
    "drizzle_migrations",
    "_prisma_migrations",
  ];

  const result = await db.execute<{ table_name: string }>(sql`
    SELECT c.relname as table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE '_pg_%'
    ORDER BY c.relname
  `);

  return (result as unknown as { table_name: string }[])
    .map((r) => r.table_name)
    .filter((t) => !systemTables.includes(t));
}

/**
 * Get all seeded permissions from role_permissions table
 */
export async function getSeededPermissions(
  db: PostgresJsDatabase
): Promise<Array<{ role_id: string; permission: string; description: string | null }>> {
  const result = await db.execute<{
    role_id: string;
    permission: string;
    description: string | null;
  }>(sql`
    SELECT role_id, permission, description
    FROM public.role_permissions
    ORDER BY role_id, permission
  `);

  return result as unknown as Array<{ role_id: string; permission: string; description: string | null }>;
}

/**
 * Analyze gaps between RLS policies and seeded permissions
 */
export async function analyzeGaps(db: PostgresJsDatabase): Promise<GapAnalysis> {
  // Get all data we need
  const [policyPermissions, seededPermissions, tablesWithoutPolicies, tablesWithoutRls] =
    await Promise.all([
      extractPolicyPermissions(db),
      getSeededPermissions(db),
      getTablesWithoutPolicies(db),
      getTablesWithoutRls(db),
    ]);

  const seededSet = new Set(seededPermissions.map((p) => p.permission));

  // Find permissions referenced in policies but not seeded
  const missingPermissions = policyPermissions
    .filter((p) => !seededSet.has(p.permission))
    .filter((p, i, arr) =>
      // Dedupe by permission
      arr.findIndex((x) => x.permission === p.permission) === i
    );

  // Check CRUD coverage for each resource
  const resources = new Set<string>();
  for (const p of seededPermissions) {
    const [resource] = p.permission.split(".");
    if (resource && resource !== "*") {
      resources.add(resource);
    }
  }

  const crudActions = ["view", "create", "edit", "delete"];
  const incompleteCrud: Array<{ resource: string; missingActions: string[] }> = [];

  for (const resource of resources) {
    const existingActions = seededPermissions
      .filter((p) => p.permission.startsWith(`${resource}.`))
      .map((p) => p.permission.split(".")[1])
      .filter(Boolean);

    // Check if admin has wildcard for this resource
    const hasWildcard =
      existingActions.includes("*") ||
      seededPermissions.some(
        (p) => p.permission === "*" && p.role_id === "admin"
      );

    if (!hasWildcard) {
      const missing = crudActions.filter(
        (action) => !existingActions.includes(action)
      );
      if (missing.length > 0) {
        incompleteCrud.push({ resource, missingActions: missing });
      }
    }
  }

  return {
    missingPermissions,
    tablesWithoutPolicies,
    tablesWithoutRls,
    incompleteCrud,
  };
}

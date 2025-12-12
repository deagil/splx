import { sql } from "drizzle-orm";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import type { TenantContext } from "@/lib/server/tenant/context";

const MAX_ROWS = 500;

function sanitizeQuery(query: string): string {
  // Remove trailing semicolons/spaces to avoid nested query parse errors
  return query.trim().replace(/;+\s*$/g, "");
}

function assertSafeSelect(query: string): void {
  const normalized = sanitizeQuery(query).toLowerCase();
  if (!normalized.startsWith("select")) {
    throw new Error("Only SELECT queries are allowed for reports");
  }

  const forbidden = ["insert", "update", "delete", "drop", "alter", "truncate"];
  if (forbidden.some((keyword) => normalized.includes(`${keyword} `))) {
    throw new Error("Mutating or DDL queries are not allowed for reports");
  }
}

export async function runReportQuery(
  tenant: TenantContext,
  query: string,
): Promise<Array<Record<string, unknown>>> {
  const cleanQuery = sanitizeQuery(query);
  assertSafeSelect(cleanQuery);

  const store = await getResourceStore(tenant);

  try {
    const wrapped = sql.raw(
      `SELECT * FROM (${cleanQuery}) AS report_subquery LIMIT ${MAX_ROWS}`,
    );
    const rows = await store.withSqlClient(async (db) => {
      const result = await db.execute(wrapped);
      return result as Array<Record<string, unknown>>;
    });
    return rows ?? [];
  } finally {
    await store.dispose();
  }
}






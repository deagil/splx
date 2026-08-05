import { sql } from "drizzle-orm";
import { getTableConfig, type TableRecord } from "@/lib/server/tables";
import {
  buildSelectQuery,
  countRecords,
  executeSelectQuery,
  type QueryOptions,
} from "@/lib/server/tables/query-builder";
import type { TenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import {
  getResourceStore,
  type ResourceStore,
} from "@/lib/server/tenant/resource-store";

const columnNameInErrorRegex = /column "([^"]+)"/;
const tableNameRegex = /^[a-zA-Z0-9_]+$/;

/**
 * Custom error class for query-related errors
 * Provides user-friendly error messages for the AI to communicate
 */
export class QueryError extends Error {
  readonly userMessage: string;
  readonly tableName?: string;

  constructor(
    message: string,
    userMessage: string,
    tableName?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "QueryError";
    this.userMessage = userMessage;
    this.tableName = tableName;
  }
}

/**
 * Parse SQL error messages into user-friendly descriptions
 */
function parseQueryError(error: unknown, tableName: string): QueryError {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Handle common SQL errors with friendly messages
  if (
    errorMessage.includes("duplicate key") ||
    errorMessage.includes("duplicate alias")
  ) {
    return new QueryError(
      errorMessage,
      `There was a configuration issue with the "${tableName}" table. The query could not be completed due to a duplicate field reference.`,
      tableName,
      { cause: error instanceof Error ? error : undefined }
    );
  }

  if (
    errorMessage.includes("column") &&
    errorMessage.includes("does not exist")
  ) {
    const columnMatch = errorMessage.match(columnNameInErrorRegex);
    const columnName = columnMatch ? columnMatch[1] : "unknown";
    return new QueryError(
      errorMessage,
      `The column "${columnName}" does not exist in the "${tableName}" table.`,
      tableName,
      { cause: error instanceof Error ? error : undefined }
    );
  }

  if (
    errorMessage.includes("relation") &&
    errorMessage.includes("does not exist")
  ) {
    return new QueryError(
      errorMessage,
      `The table "${tableName}" does not exist or is not accessible.`,
      tableName,
      { cause: error instanceof Error ? error : undefined }
    );
  }

  if (errorMessage.includes("permission denied")) {
    return new QueryError(
      errorMessage,
      `You don't have permission to access the "${tableName}" table.`,
      tableName,
      { cause: error instanceof Error ? error : undefined }
    );
  }

  if (errorMessage.includes("syntax error")) {
    return new QueryError(
      errorMessage,
      "There was an issue with the query syntax. Please try a simpler query.",
      tableName,
      { cause: error instanceof Error ? error : undefined }
    );
  }

  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("canceling statement")
  ) {
    return new QueryError(
      errorMessage,
      "The query took too long to execute. Try adding more specific filters or reducing the limit.",
      tableName,
      { cause: error instanceof Error ? error : undefined }
    );
  }

  // Generic fallback
  return new QueryError(
    errorMessage,
    `Unable to query the "${tableName}" table. Please try again or contact support if the issue persists.`,
    tableName,
    { cause: error instanceof Error ? error : undefined }
  );
}

export interface QueryUserTableInput {
  filters?: Array<{
    column: string;
    operator: FilterOperator;
    value: string | null;
  }>;
  limit?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  page?: number;
  tableName: string;
}

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "is_null"
  | "is_not_null";

export interface QueryUserTableResult {
  columns: string[];
  pagination: {
    page: number;
    limit: number;
    totalRows: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  rows: Record<string, unknown>[];
  tableName: string;
}

/**
 * Converts tool filter format to query builder filters format
 */
function convertFilters(
  filters: QueryUserTableInput["filters"]
): Record<string, unknown> {
  if (!filters || filters.length === 0) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const filter of filters) {
    // The query builder expects simple equality filters
    // For more complex operators, we would need to extend the query builder
    // For now, we'll handle basic equality
    if (filter.operator === "equals") {
      result[filter.column] = filter.value;
    } else if (filter.operator === "is_null") {
      result[filter.column] = null;
    }
    // Note: contains, greater_than, etc. would require extending the query builder
    // For MVP, we'll focus on equality filters
  }

  return result;
}

/**
 * Escape SQL identifier (table/column names)
 */
function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Execute a simple SELECT * query as fallback when complex queries fail
 */
async function executeSimpleQuery(
  db: any,
  tableName: string,
  limit: number,
  offset: number
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const escapedTable = escapeIdentifier(tableName);

  // Simple count
  const countResult = (await db.execute(
    sql.raw(`SELECT COUNT(*) as count FROM ${escapedTable}`)
  )) as Array<{ count: string }>;
  const total = Number.parseInt(countResult[0]?.count ?? "0", 10);

  // Simple select
  const rows = (await db.execute(
    sql.raw(`SELECT * FROM ${escapedTable} LIMIT ${limit} OFFSET ${offset}`)
  )) as Record<string, unknown>[];

  return { rows, total };
}

/**
 * Query user data tables using the mode-aware resource store.
 * This function respects the APP_MODE (local vs hosted) and uses
 * the appropriate database connection for user data.
 *
 * @param tenant - The resolved tenant context
 * @param input - Query parameters
 * @returns Query results with pagination
 * @throws QueryError with user-friendly message if query fails
 */
export async function queryUserTable(
  tenant: TenantContext,
  input: QueryUserTableInput
): Promise<QueryUserTableResult> {
  // Check permissions
  try {
    requireCapability(tenant, "data.view");
  } catch (error) {
    const err = new QueryError(
      "Permission denied",
      "You don't have permission to view data.",
      input.tableName
    );
    err.cause = error;
    throw err;
  }

  const {
    tableName,
    filters = [],
    limit = 50,
    page = 1,
    orderBy,
    orderDirection = "asc",
  } = input;

  // Validate table name
  if (!tableName || !tableNameRegex.test(tableName)) {
    throw new QueryError(
      "Invalid table name",
      `The table name "${tableName}" is invalid. Table names can only contain letters, numbers, and underscores.`,
      tableName
    );
  }

  // Get table configuration to verify table exists and get metadata
  let tableConfig;
  try {
    tableConfig = await getTableConfig(tenant, tableName);
  } catch (error) {
    console.error(
      `[queryUserTable] Error getting table config for "${tableName}":`,
      error
    );
    const err = new QueryError(
      "Table config error",
      `Unable to load configuration for table "${tableName}".`,
      tableName
    );
    err.cause = error;
    throw err;
  }

  if (!tableConfig) {
    // Try to list available tables to provide helpful suggestion
    try {
      const { listTableConfigs } = await import("@/lib/server/tables");
      const tables = await listTableConfigs(tenant);
      const tableNames = tables.map((t) => t.id);

      if (tableNames.length > 0) {
        throw new QueryError(
          "Table not found",
          `Table "${tableName}" not found. Available tables: ${tableNames.join(", ")}`,
          tableName
        );
      }
    } catch (e) {
      if (e instanceof QueryError) {
        throw e;
      }
    }

    throw new QueryError(
      "Table not found",
      `Table "${tableName}" not found.`,
      tableName
    );
  }

  // Get the mode-aware resource store
  let store;
  try {
    store = await getResourceStore(tenant);
  } catch (error) {
    console.error("[queryUserTable] Error getting resource store:", error);
    const err = new QueryError(
      "Connection error",
      "Unable to connect to the database. Please try again.",
      tableName
    );
    err.cause = error;
    throw err;
  }

  try {
    const offset = (page - 1) * limit;
    const convertedFilters = convertFilters(filters);

    const queryOptions: QueryOptions = {
      filters: convertedFilters,
      includeLabels: true,
      limit,
      offset,
      orderBy,
      orderDirection,
    };

    let rows: Record<string, unknown>[];
    let columns: string[];
    let total: number;

    try {
      // Try the full query with joins and labels
      const result = await store.withSqlClient(async (db) => {
        const { query } = await buildSelectQuery(
          db,
          tenant,
          tableConfig,
          tableName,
          queryOptions
        );

        const queryRows = await executeSelectQuery(db, query);
        const queryTotal = await countRecords(db, tableName, convertedFilters);

        return {
          columns:
            queryRows.length > 0
              ? Object.keys(queryRows[0] as Record<string, unknown>)
              : [],
          rows: queryRows,
          total: queryTotal,
        };
      });

      ({ rows, columns, total } = result);
    } catch (complexQueryError) {
      // Log the error for debugging
      console.error(
        `[queryUserTable] Complex query failed for "${tableName}", trying simple query:`,
        complexQueryError
      );

      // Fallback to simple query without joins/labels
      try {
        const simpleResult = await store.withSqlClient(async (db) =>
          executeSimpleQuery(db, tableName, limit, offset)
        );

        ({ rows, total } = simpleResult);
        columns =
          rows.length > 0
            ? Object.keys(rows[0] as Record<string, unknown>)
            : [];

        console.log(
          `[queryUserTable] Simple query succeeded for "${tableName}": ${rows.length} rows`
        );
      } catch (simpleQueryError) {
        // Both queries failed, throw a user-friendly error
        console.error(
          `[queryUserTable] Simple query also failed for "${tableName}":`,
          simpleQueryError
        );
        throw parseQueryError(simpleQueryError, tableName);
      }
    }

    const totalPages = limit === 0 ? 0 : Math.max(1, Math.ceil(total / limit));

    return {
      columns,
      pagination: {
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
        page,
        totalPages,
        totalRows: total,
      },
      rows,
      tableName,
    };
  } finally {
    try {
      await store.dispose();
    } catch (disposeError) {
      console.error("[queryUserTable] Error disposing store:", disposeError);
    }
  }
}

/**
 * List available user tables (non-system tables)
 */
export async function listUserTables(
  tenant: TenantContext
): Promise<Array<{ name: string; description: string | null }>> {
  requireCapability(tenant, "tables.view");

  const { listTableConfigs } = await import("@/lib/server/tables");
  const tables = await listTableConfigs(tenant);

  return tables.map((t) => ({
    description: t.description ?? null,
    name: t.id,
  }));
}

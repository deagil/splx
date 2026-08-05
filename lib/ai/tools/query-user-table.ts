import { tool } from "ai";
import { z } from "zod";
import {
  type FilterOperator,
  listUserTables,
  QueryError,
  queryUserTable as queryUserTableFn,
} from "@/lib/server/data/query";
import { TableNotFoundError } from "@/lib/server/tables";
import {
  resolveTenantContext,
  type TenantContext,
} from "@/lib/server/tenant/context";

const filterOperators = [
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "is_null",
  "is_not_null",
] as const;

const filterSchema = z.object({
  column: z.string().min(1).describe("The column name to filter on"),
  operator: z.enum(filterOperators).describe("The filter operator to apply"),
  value: z
    .string()
    .nullable()
    .describe("The value to compare against (null for is_null/is_not_null)"),
});

const inputSchema = z.object({
  filters: z
    .array(filterSchema)
    .optional()
    .default([])
    .describe("Optional array of filters to apply to the query"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe("Number of rows to return (max 100, default 50)"),
  orderBy: z.string().optional().describe("Column name to order results by"),
  orderDirection: z
    .enum(["asc", "desc"])
    .optional()
    .default("asc")
    .describe("Sort direction (default ascending)"),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe("Page number for pagination (default 1)"),
  tableName: z
    .string()
    .min(1)
    .describe(
      "The name of the user table to query (not system tables like pages, users, etc.)"
    ),
});

/**
 * AI Tool: Query user data tables
 *
 * This tool allows the AI to query user-created data tables (like contacts, orders, products)
 * using the mode-aware resource store. It does NOT query system tables directly.
 *
 * Security:
 * - Uses existing permission layer (requireCapability)
 * - Respects APP_MODE (local vs hosted)
 * - Only queries tables registered in the tables config (user tables)
 */
export const queryUserTable = tool({
  description:
    "Query data from user-created tables (like contacts, orders, products - NOT system tables). Use this to look up records with filtering, pagination, and sorting. For navigating to specific records, combine with searchPages and navigateToPage tools.",
  execute: async ({
    tableName,
    filters,
    limit,
    page,
    orderBy,
    orderDirection,
  }) => {
    let tenant: TenantContext;
    try {
      tenant = await resolveTenantContext();
    } catch (error) {
      console.error(
        "[queryUserTable] Failed to resolve tenant context:",
        error
      );
      throw new Error("Unable to access workspace context. Please try again.", {
        cause: error,
      });
    }

    try {
      const result = await queryUserTableFn(tenant, {
        filters: filters.map((f) => ({
          column: f.column,
          operator: f.operator as FilterOperator,
          value: f.value,
        })),
        limit,
        orderBy,
        orderDirection,
        page,
        tableName,
      });

      return result;
    } catch (error) {
      // Handle QueryError with user-friendly message
      if (error instanceof QueryError) {
        console.error(
          `[queryUserTable] QueryError for "${tableName}":`,
          error.message
        );
        throw new Error(error.userMessage, { cause: error });
      }

      // Handle TableNotFoundError
      if (error instanceof TableNotFoundError) {
        try {
          const tables = await listUserTables(tenant);
          const tableNames = tables.map((t) => t.name);
          throw new Error(
            `Table "${tableName}" not found. Available tables: ${tableNames.join(", ") || "none"}`,
            { cause: error }
          );
        } catch (listError) {
          if (
            listError instanceof Error &&
            listError.message.includes("not found")
          ) {
            throw listError;
          }
          throw new Error(`Table "${tableName}" not found.`, {
            cause: listError,
          });
        }
      }

      // Handle permission errors
      if (error instanceof Error && error.message === "Forbidden") {
        throw new Error("You don't have permission to query this data.", {
          cause: error,
        });
      }

      // Log unexpected errors for debugging
      console.error(
        `[queryUserTable] Unexpected error for "${tableName}":`,
        error
      );

      // Return a user-friendly message for unexpected errors
      if (error instanceof Error) {
        throw new Error(`Unable to query "${tableName}": ${error.message}`, {
          cause: error,
        });
      }

      throw new Error(`Unable to query "${tableName}". Please try again.`, {
        cause: error,
      });
    }
  },
  inputSchema,
});

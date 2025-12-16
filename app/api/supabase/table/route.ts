import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { sql } from "drizzle-orm";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { getResourceStore } from "@/lib/server/tenant/resource-store";

const COLUMN_NAME_REGEX = /^[a-zA-Z0-9_]+$/;
const TABLE_NAME_REGEX = /^[a-zA-Z0-9_]+$/;

const querySchema = z.object({
  table: z
    .string()
    .min(1, "Table name is required")
    .regex(TABLE_NAME_REGEX, "Table name must be alphanumeric or underscore"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  filters: z
    .array(
      z.object({
        column: z
          .string()
          .min(1)
          .regex(COLUMN_NAME_REGEX, "Invalid column name"),
        operator: z.enum([
          "equals",
          "not_equals",
          "contains",
          "greater_than",
          "less_than",
          "greater_than_or_equal",
          "less_than_or_equal",
          "is_null",
          "is_not_null",
        ]),
        value: z.string().nullable(),
      }),
    )
    .default([]),
});

export async function GET(request: Request) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "pages.view");
    const url = new URL(request.url);
    const parsedQuery = parseQuery(url.searchParams);
    const validated = querySchema.parse(parsedQuery);

    const store = await getResourceStore(tenant);

    try {
      const start = (validated.page - 1) * validated.limit;

      const { rows, count } = await store.withSqlClient(async (db) => {
        // Build WHERE clause from filters
        const whereConditions: string[] = [];

        for (const filter of validated.filters) {
          const column = escapeIdentifier(filter.column);
          const operator = filter.operator;
          const value = filter.value;

          if (operator === "is_null") {
            whereConditions.push(`${column} IS NULL`);
          } else if (operator === "is_not_null") {
            whereConditions.push(`${column} IS NOT NULL`);
          } else if (value !== null && value !== undefined) {
            const escapedValue = escapeString(value);
            if (operator === "equals") {
              whereConditions.push(`${column} = ${escapedValue}`);
            } else if (operator === "not_equals") {
              whereConditions.push(`${column} != ${escapedValue}`);
            } else if (operator === "contains") {
              whereConditions.push(
                `${column} ILIKE ${escapeString(`%${value}%`)}`,
              );
            } else if (operator === "greater_than") {
              whereConditions.push(`${column} > ${escapedValue}`);
            } else if (operator === "less_than") {
              whereConditions.push(`${column} < ${escapedValue}`);
            } else if (operator === "greater_than_or_equal") {
              whereConditions.push(`${column} >= ${escapedValue}`);
            } else if (operator === "less_than_or_equal") {
              whereConditions.push(`${column} <= ${escapedValue}`);
            }
          }
        }

        const whereClause = whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

        const tableName = escapeIdentifier(validated.table);

        // Get total count
        const countQuery = sql.raw(
          `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`,
        );
        const countResult = await db.execute(countQuery);
        const totalCount = Number.parseInt(
          (countResult[0] as { count: string | number }).count.toString(),
          10,
        ) || 0;

        // Get paginated rows
        const dataQuery = sql.raw(
          `SELECT * FROM ${tableName} ${whereClause} LIMIT ${validated.limit} OFFSET ${start}`,
        );
        const dataResult = await db.execute(dataQuery);

        return {
          rows: dataResult as Array<Record<string, unknown>>,
          count: totalCount,
        };
      });

      const columns = rows.length > 0
        ? Object.keys(rows[0] as Record<string, unknown>)
        : [];

      return NextResponse.json({
        tableName: validated.table,
        columns,
        rows,
        pagination: {
          page: validated.page,
          limit: validated.limit,
          totalRows: count ?? rows.length,
          totalPages: validated.limit === 0
            ? 0
            : Math.max(1, Math.ceil((count ?? rows.length) / validated.limit)),
        },
      });
    } finally {
      await store.dispose();
    }
  } catch (error) {
    return handleError(error);
  }
}

function parseQuery(searchParams: URLSearchParams) {
  const table = searchParams.get("table") ?? "";
  const page = searchParams.get("page") ?? undefined;
  const limit = searchParams.get("limit") ?? undefined;

  const filterOperators = new Map<string, string>();
  const filterValues = new Map<string, string | null>();

  for (const [key, value] of searchParams.entries()) {
    const operatorMatch = /^filter_op\[(.+)]$/.exec(key);
    const valueMatch = /^filter\[(.+)]$/.exec(key);

    if (operatorMatch?.[1]) {
      filterOperators.set(operatorMatch[1], value);
    } else if (valueMatch?.[1]) {
      filterValues.set(valueMatch[1], value);
    }
  }

  const filters: Array<{
    column: string;
    operator: string;
    value: string | null;
  }> = [];

  const columns = new Set([
    ...filterOperators.keys(),
    ...filterValues.keys(),
  ]);

  columns.forEach((column) => {
    filters.push({
      column,
      operator: filterOperators.get(column) ?? "equals",
      value: filterValues.get(column) ?? null,
    });
  });

  return {
    table,
    page,
    limit,
    filters,
  };
}

function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function escapeString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    if (error.message === "Forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { error: "Unknown error" },
    { status: 500 },
  );
}

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { sql } from "drizzle-orm";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { getResourceStore } from "@/lib/server/tenant/resource-store";

const COLUMN_NAME_REGEX = /^[a-zA-Z0-9_]+$/;

const querySchema = z.object({
  table: z
    .string()
    .min(1, "Table is required")
    .regex(COLUMN_NAME_REGEX, "Table name must be alphanumeric or underscore"),
  idColumn: z
    .string()
    .min(1)
    .regex(COLUMN_NAME_REGEX, "Column name must be alphanumeric or underscore")
    .default("id"),
  id: z.string().min(1, "Record identifier is required"),
});

export async function GET(request: Request) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "pages.view");
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      table: url.searchParams.get("table"),
      idColumn: url.searchParams.get("idColumn") ?? "id",
      id: url.searchParams.get("id"),
    });

    const store = await getResourceStore(tenant);

    try {
      const record = await store.withSqlClient(async (db) => {
        const tableName = escapeIdentifier(parsed.table);
        const idColumn = escapeIdentifier(parsed.idColumn);
        const idValue = escapeString(parsed.id);

        const query = sql.raw(
          `SELECT * FROM ${tableName} WHERE ${idColumn} = ${idValue} LIMIT 1`,
        );
        const result = await db.execute(query);

        return (result[0] as Record<string, unknown>) ?? null;
      });

      const columns = record
        ? Object.keys(record as Record<string, unknown>)
        : [];

      if (!record) {
        return NextResponse.json(
          {
            tableName: parsed.table,
            record: null,
            columns,
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        tableName: parsed.table,
        record,
        columns,
      });
    } finally {
      await store.dispose();
    }
  } catch (error) {
    return handleError(error);
  }
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

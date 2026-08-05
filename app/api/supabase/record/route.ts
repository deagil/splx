import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { getResourceStore } from "@/lib/server/tenant/resource-store";

const COLUMN_NAME_REGEX = /^[a-zA-Z0-9_]+$/;

const querySchema = z.object({
  id: z.string().min(1, "Record identifier is required"),
  idColumn: z
    .string()
    .min(1)
    .regex(COLUMN_NAME_REGEX, "Column name must be alphanumeric or underscore")
    .default("id"),
  table: z
    .string()
    .min(1, "Table is required")
    .regex(COLUMN_NAME_REGEX, "Table name must be alphanumeric or underscore"),
});

export async function GET(request: Request) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "data.view");
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      id: url.searchParams.get("id"),
      idColumn: url.searchParams.get("idColumn") ?? "id",
      table: url.searchParams.get("table"),
    });

    const store = await getResourceStore(tenant);

    try {
      const record = await store.withSqlClient(async (db) => {
        const tableName = escapeIdentifier(parsed.table);
        const idColumn = escapeIdentifier(parsed.idColumn);
        const idValue = escapeString(parsed.id);

        const query = sql.raw(
          `SELECT * FROM ${tableName} WHERE ${idColumn} = ${idValue} LIMIT 1`
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
            columns,
            record: null,
            tableName: parsed.table,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        columns,
        record,
        tableName: parsed.table,
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
          message: issue.message,
          path: issue.path.join("."),
        })),
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown error" }, { status: 500 });
}

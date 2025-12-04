import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { getResourceStore } from "@/lib/server/tenant/resource-store";

type PageProps = {
  params: Promise<{ tableName: string }>;
};

/**
 * GET /api/data/[tableName]/schema
 * Get the schema (columns) for a specific table
 */
export async function GET(_request: Request, { params }: PageProps) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "data.read");

    const { tableName } = await params;

    const store = await getResourceStore(tenant);

    try {
      const columns = await store.withSqlClient(async (db) => {
        const rows = (await db.execute(sql`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${tableName}
          ORDER BY ordinal_position
        `)) as Array<{
          column_name: string;
          data_type: string;
          is_nullable: string;
          column_default: string | null;
          character_maximum_length: number | null;
        }>;

        return rows.map((row) => ({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable,
          column_default: row.column_default,
          character_maximum_length: row.character_maximum_length,
        }));
      });

      if (columns.length === 0) {
        return NextResponse.json(
          { error: "Table not found or has no columns" },
          { status: 404 }
        );
      }

      return NextResponse.json({ columns });
    } finally {
      await store.dispose();
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

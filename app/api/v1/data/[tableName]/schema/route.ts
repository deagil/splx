import { sql } from "drizzle-orm";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";

type Params = { tableName: string };

type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
};

/**
 * Column list for a table, used by the data grid to build its editor.
 *
 * Gated on `data.view`. It previously asked for `data.read`, which existed in
 * neither the static map nor `role_permissions`, so every non-admin got a 403.
 */
export const GET = endpoint<undefined, Params, { columns: ColumnInfo[] }>({
  auth: "required",
  permission: "data.view",
  async handler({ user, params }) {
    const store = await getResourceStore(user.tenant);

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
            AND table_name = ${params.tableName}
          ORDER BY ordinal_position
        `)) as ColumnInfo[];

        return rows.map((row) => ({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable,
          column_default: row.column_default,
          character_maximum_length: row.character_maximum_length,
        }));
      });

      if (columns.length === 0) {
        throw new ApiError(404, "Table not found or has no columns");
      }

      return { data: { columns } };
    } finally {
      await store.dispose();
    }
  },
});

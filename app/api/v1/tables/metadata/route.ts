import { listTableConfigs } from "@/lib/server/tables";
import { getTableConfigCached } from "@/lib/server/tables/cache";
import type { TableRecord } from "@/lib/server/tables/types";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";

/** `?table=` returns one config; otherwise the whole list. */
type MetadataResult = { table: TableRecord } | { tables: TableRecord[] };

/** Table metadata configs. Read-only, so gated on `tables.view`. */
export const GET = endpoint<undefined, unknown, MetadataResult>({
  auth: "required",
  permission: "tables.view",
  async handler({ user, query }) {
    const tableParam = query.get("table");

    if (tableParam) {
      const table = await getTableConfigCached(user.tenant, tableParam);
      if (!table) {
        throw new ApiError(404, "Table not found");
      }
      return { data: { table } };
    }

    const tables = await listTableConfigs(user.tenant);
    return { data: { tables } };
  },
});

import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { getTableConfig, listTableConfigs } from "@/lib/server/tables";
import { getTableConfigCached } from "@/lib/server/tables/cache";

/**
 * GET /api/tables/metadata
 * List all table metadata configurations
 */
export async function GET(request: Request) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "pages.view");

    const url = new URL(request.url);
    const tableParam = url.searchParams.get("table");

    if (tableParam) {
      const table = await getTableConfigCached(tenant, tableParam);
      if (!table) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }
      return NextResponse.json({ table });
    }

    const tables = await listTableConfigs(tenant);
    return NextResponse.json({ tables });
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

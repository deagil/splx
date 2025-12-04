import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { listTableConfigs } from "@/lib/server/tables";

/**
 * GET /api/tables/metadata
 * List all table metadata configurations
 */
export async function GET() {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "pages.view");

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

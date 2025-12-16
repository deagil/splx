import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { runReportQuery } from "@/lib/server/reports/run-query";

export async function POST(request: Request) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "tables.view");

    const body = await request.json();
    const { sql } = body;

    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 });
    }

    const data = await runReportQuery(tenant, sql);

    return NextResponse.json({ data });
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

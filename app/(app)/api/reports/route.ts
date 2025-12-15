import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { createReport, listReports } from "@/lib/server/reports";

export async function GET() {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "tables.view");
    const reports = await listReports(tenant);
    return NextResponse.json({ reports });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await resolveTenantContext();
    requireCapability(tenant, "tables.edit");
    const payload = await request.json();
    const report = await createReport(tenant, payload);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown error" }, { status: 500 });
}







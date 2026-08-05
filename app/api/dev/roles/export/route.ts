import { type NextRequest, NextResponse } from "next/server";
import {
  generateMigrationFilename,
  generateMigrationSql,
  type PermissionChange,
} from "@/lib/server/roles/generate-migration";
import { resolveTenantContext } from "@/lib/server/tenant/context";

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenantContext();

    if (!tenant.roles.includes("admin")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const changes = body.changes as PermissionChange[];

    if (!Array.isArray(changes)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const sql = generateMigrationSql(changes);
    const filename = generateMigrationFilename();

    return NextResponse.json({
      content: sql,
      filename,
    });
  } catch (error) {
    console.error("Error generating migration:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

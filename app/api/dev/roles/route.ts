import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getSeededPermissions } from "@/lib/server/roles/introspect-policies";

export async function GET() {
  try {
    const tenant = await resolveTenantContext();

    if (!tenant.roles.includes("admin")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const sql = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(sql);

    try {
      const seededPermissions = await getSeededPermissions(db);
      
      // Transform into a structure easier for the UI
      // { roles: ['admin', 'builder', ...], permissions: [{ role_id, permission, ... }] }
      // The role definitions are currently static in ROLE_CAPABILITIES (lib/server/tenant/permissions.ts)
      // but we display them dynamically based on what's in the DB + known defaults.
      
      const roles = ["admin", "builder", "user", "viewer"];
      
      return NextResponse.json({
        roles,
        permissions: seededPermissions
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

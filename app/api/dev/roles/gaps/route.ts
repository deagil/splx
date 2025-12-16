import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { analyzeGaps } from "@/lib/server/roles/introspect-policies";

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
      const gaps = await analyzeGaps(db);
      return NextResponse.json(gaps);
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (error) {
    console.error("Error analyzing gaps:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

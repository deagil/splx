import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { createTableConfig, ReservedTableNameError } from "@/lib/server/tables";

// System tables used in LOCAL mode only
// These tables support the application's functionality and live in the main database
// In HOSTED mode, these are queried from the main DB, not the resource store
const SYSTEM_TABLES = new Set([
    // Platform tables
    "users",
    "workspaces",
    "roles",
    "teams",
    "workspace_users",
    "workspace_invites",
    "workspace_apps",
    // Application metadata tables
    "pages",
    "tables",
    "reports",
    "chats",
    "messages",
    "votes",
    "documents",
    "suggestions",
    "streams",
    "ai_skills",
]);

export async function GET(request: Request) {
    try {
        const tenant = await resolveTenantContext();
        requireCapability(tenant, "pages.view");

        const url = new URL(request.url);
        const type = url.searchParams.get("type") ?? "data"; // "data" or "config"

        // Mode-aware table filtering
        if (tenant.mode === "local") {
            // LOCAL MODE: Resource store points to main DB (contains both system and user tables)
            // Use name-based filtering to separate them
            const store = await getResourceStore(tenant);

            try {
                const tables = await store.withSqlClient(async (db) => {
                    const rows = await db.execute(sql`
                        SELECT
                            table_schema,
                            table_name,
                            table_type
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                            AND table_type = 'BASE TABLE'
                        ORDER BY table_name
                    `) as Array<{
                        table_schema: string;
                        table_name: string;
                        table_type: string;
                    }>;

                    return rows.map((row) => ({
                        schema: row.table_schema,
                        name: row.table_name,
                        type: row.table_type,
                    }));
                });

                // console.log("[DEBUG] Total tables found:", tables.length);
                // console.log(
                //     "[DEBUG] Table names:",
                //     tables.map((t) => t.name).join(", "),
                // );
                // console.log("[DEBUG] Filtering for type:", type);

                const filtered = tables.filter((table) => {
                    const isSystemTable = SYSTEM_TABLES.has(
                        table.name.toLowerCase(),
                    );
                    const shouldInclude = type === "data"
                        ? !isSystemTable
                        : isSystemTable;
                    // console.log(
                    //     `[DEBUG] Table "${table.name}": isSystemTable=${isSystemTable}, shouldInclude=${shouldInclude}`,
                    // );
                    return shouldInclude;
                });

                // console.log("[DEBUG] Filtered tables count:", filtered.length);
                // console.log(
                //     "[DEBUG] Filtered table names:",
                //     filtered.map((t) => t.name).join(", "),
                // );

                return NextResponse.json({ tables: filtered });
            } finally {
                await store.dispose();
            }
        } else {
            // HOSTED MODE: Different sources for data vs config tables
            if (type === "data") {
                // DATA TABLES: Query resource store (user's connected database)
                // All tables from resource store are user data tables - NO filtering needed
                const store = await getResourceStore(tenant);

                try {
                    const tables = await store.withSqlClient(async (db) => {
                        const rows = await db.execute(sql`
                            SELECT
                                table_schema,
                                table_name,
                                table_type
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                                AND table_type = 'BASE TABLE'
                            ORDER BY table_name
                        `) as Array<{
                            table_schema: string;
                            table_name: string;
                            table_type: string;
                        }>;

                        return rows.map((row) => ({
                            schema: row.table_schema,
                            name: row.table_name,
                            type: row.table_type,
                        }));
                    });

                    // No filtering - all tables are user data
                    return NextResponse.json({ tables });
                } finally {
                    await store.dispose();
                }
            } else {
                // CONFIG TABLES: Query main database directly (system tables)
                const pgClient = postgres(process.env.POSTGRES_URL!);
                const db = drizzle(pgClient);

                try {
                    const rows = await db.execute(sql`
                        SELECT
                            table_schema,
                            table_name,
                            table_type
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                            AND table_type = 'BASE TABLE'
                        ORDER BY table_name
                    `) as Array<{
                        table_schema: string;
                        table_name: string;
                        table_type: string;
                    }>;

                    const tables = rows.map((row) => ({
                        schema: row.table_schema,
                        name: row.table_name,
                        type: row.table_type,
                    }));

                    // Filter to only system tables
                    const filtered = tables.filter((table) =>
                        SYSTEM_TABLES.has(table.name.toLowerCase())
                    );

                    return NextResponse.json({ tables: filtered });
                } finally {
                    await pgClient.end({ timeout: 5 });
                }
            }
        }
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: Request) {
    try {
        const tenant = await resolveTenantContext();
        requireCapability(tenant, "tables.edit");
        const payload = await request.json();
        const table = await createTableConfig(tenant, payload);
        return NextResponse.json({ table }, { status: 201 });
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

    if (error instanceof ReservedTableNameError) {
        return NextResponse.json(
            {
                error: error.message,
            },
            { status: 400 },
        );
    }

    if (error instanceof Error) {
        if (error.message === "Forbidden") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            );
        }
        return NextResponse.json(
            { error: error.message },
            { status: 500 },
        );
    }

    return NextResponse.json(
        { error: "Unknown error" },
        { status: 500 },
    );
}

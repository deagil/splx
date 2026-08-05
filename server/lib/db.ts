import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { DbClient } from "@/lib/server/tenant/context";

/**
 * Connection to the **main** database (`POSTGRES_URL`) for control-plane tables.
 *
 * `audit_logs`, `event_logs`, workflow tables, and `role_permissions` are
 * created by the Supabase migrations and therefore live in the main database.
 * In hosted mode the resource store is a *different* database per workspace, so
 * writing them through `getResourceStore()` would target a database where those
 * tables do not exist. Everything in `server/lib/*` and `server/workflows/*`
 * must use this client, not the resource store.
 *
 * A module-level pool, unlike `resolveTenantContext()` which opens and closes
 * one per call. Next.js may evaluate this module more than once across route
 * bundles; postgres.js pools are lazy, so an unused duplicate costs nothing.
 */
let client: ReturnType<typeof postgres> | null = null;
let db: DbClient | null = null;

export function getControlPlaneDb(): DbClient {
  if (!db) {
    const url = process.env.POSTGRES_URL;
    if (!url) {
      throw new Error("POSTGRES_URL is not configured");
    }
    client = postgres(url, { max: 5 });
    db = drizzle(client);
  }
  return db;
}

/** Test seam / graceful shutdown. */
export async function closeControlPlaneDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = null;
    db = null;
  }
}

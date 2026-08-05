import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integration tests for the data repository against a real Postgres.
 *
 * Skipped unless `TEST_POSTGRES_URL` is set, so `pnpm test:unit` stays
 * dependency-free by default. To run them:
 *
 *   TEST_POSTGRES_URL=postgres://... pnpm test:unit
 *
 * The database must have the Supabase migrations applied and a workspace,
 * roles, and the `contacts` / `widgets` tables seeded — see
 * docs/API_CONTROL_PLANE.md.
 *
 * Only `getTableConfig` is mocked: it reads through Supabase PostgREST, which
 * is not available here. Everything else — the generated SQL, the tenant
 * predicate, audit writes, event emission — runs against the real database.
 */

const TEST_DB = process.env.TEST_POSTGRES_URL;
const describeIfDb = TEST_DB ? describe : describe.skip;

const WORKSPACE_A = "aaaaaaaa-0000-0000-0000-000000000001";
const WORKSPACE_B = "bbbbbbbb-0000-0000-0000-000000000002";
const ACTOR = "11111111-1111-1111-1111-111111111111";

if (TEST_DB) {
  process.env.POSTGRES_URL = TEST_DB;
  process.env.APP_MODE = "local";
}

vi.mock("@/lib/server/tables", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/tables")>();
  return {
    ...actual,
    getTableConfig: vi.fn(async (_tenant: unknown, tableId: string) => {
      if (tableId !== "contacts" && tableId !== "widgets") {
        return null;
      }
      return {
        id: tableId,
        workspace_id: WORKSPACE_A,
        name: tableId,
        description: null,
        config: { primary_key_column: "id", relationships: [], label_fields: [] },
        created_by: ACTOR,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }),
  };
});

const { dataRepository } = await import("./data");
const { getControlPlaneDb, closeControlPlaneDb } = await import(
  "@/server/lib/db"
);

function tenant(workspaceId: string) {
  return {
    mode: "local" as const,
    workspaceId,
    userId: ACTOR,
    roles: ["admin"],
    connectionId: null,
  };
}

const INJECTION = ["1); DROP TABLE contacts; --"];

describeIfDb("dataRepository (integration)", () => {
  const repo = () =>
    dataRepository({ tenant: tenant(WORKSPACE_A), requestId: "test-req" });

  beforeEach(async () => {
    const db = getControlPlaneDb();
    const { sql } = await import("drizzle-orm");
    // Scoped to this file's workspaces so a shared dev database is not wiped.
    await db.execute(sql`DELETE FROM public.contacts`);
    await db.execute(sql`DELETE FROM public.widgets`);
    await db.execute(
      sql`DELETE FROM public.audit_logs WHERE workspace_id IN (${WORKSPACE_A}, ${WORKSPACE_B})`
    );
    await db.execute(
      sql`DELETE FROM public.event_logs WHERE workspace_id IN (${WORKSPACE_A}, ${WORKSPACE_B})`
    );
  });

  afterAll(async () => {
    await closeControlPlaneDb();
  });

  it("creates a row, stamps workspace_id, and writes audit + event", async () => {
    const record = await repo().create("contacts", { name: "Ada", qty: 7 });

    expect(record.name).toBe("Ada");
    expect(record.qty).toBe(7);
    expect(record.workspace_id).toBe(WORKSPACE_A);

    const db = getControlPlaneDb();
    const { sql } = await import("drizzle-orm");

    const audit = (await db.execute(
      sql`SELECT action, resource_type, request_id FROM public.audit_logs`
    )) as Array<Record<string, unknown>>;
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("data.created");
    expect(audit[0].resource_type).toBe("contacts");
    expect(audit[0].request_id).toBe("test-req");

    const events = (await db.execute(
      sql`SELECT event_name FROM public.event_logs`
    )) as Array<Record<string, unknown>>;
    expect(events).toHaveLength(1);
    expect(events[0].event_name).toBe("db.contacts.created");
  });

  it("stores an injection payload as data without executing it", async () => {
    const record = await repo().create("contacts", {
      name: "attack",
      notes: INJECTION,
    });

    expect(record.notes).toEqual(INJECTION);

    // The table it tried to drop is still here, with the row in it.
    const db = getControlPlaneDb();
    const { sql } = await import("drizzle-orm");
    const rows = (await db.execute(
      sql`SELECT count(*)::int AS n FROM public.contacts`
    )) as Array<{ n: number }>;
    expect(rows[0].n).toBe(1);
  });

  it("rejects unknown columns", async () => {
    await expect(
      repo().create("contacts", { name: "Ada", is_admin: true })
    ).rejects.toThrow(/is_admin/);
  });

  it("refuses a caller-supplied workspace_id", async () => {
    await expect(
      repo().create("contacts", { name: "Ada", workspace_id: WORKSPACE_B })
    ).rejects.toThrow(/managed by the server/);
  });

  it("does not update a row belonging to another workspace", async () => {
    const mine = await repo().create("contacts", { name: "Ada" });

    // Reassign it to workspace B behind the repository's back.
    const db = getControlPlaneDb();
    const { sql } = await import("drizzle-orm");
    await db.execute(
      sql`UPDATE public.contacts SET workspace_id = ${WORKSPACE_B} WHERE id = ${mine.id as string}`
    );

    const updated = await repo().update("contacts", mine.id as string, {
      name: "changed",
    });
    expect(updated).toBeNull();

    const rows = (await db.execute(
      sql`SELECT name FROM public.contacts WHERE id = ${mine.id as string}`
    )) as Array<{ name: string }>;
    expect(rows[0].name).toBe("Ada");
  });

  it("does not delete a row belonging to another workspace", async () => {
    const mine = await repo().create("contacts", { name: "Ada" });

    const db = getControlPlaneDb();
    const { sql } = await import("drizzle-orm");
    await db.execute(
      sql`UPDATE public.contacts SET workspace_id = ${WORKSPACE_B} WHERE id = ${mine.id as string}`
    );

    await expect(
      repo().remove("contacts", mine.id as string)
    ).resolves.toBe(false);

    const rows = (await db.execute(
      sql`SELECT count(*)::int AS n FROM public.contacts`
    )) as Array<{ n: number }>;
    expect(rows[0].n).toBe(1);
  });

  it("reports false when deleting a nonexistent id", async () => {
    // The old route returned { success: true } unconditionally.
    await expect(
      repo().remove("contacts", "00000000-0000-0000-0000-000000000000")
    ).resolves.toBe(false);
  });

  it("works on a table with no workspace_id column", async () => {
    // widgets has no workspace_id, so no tenant predicate is possible — the
    // boundary is the config registry only. Documented in
    // docs/DATABASE_ARCHITECTURE.md.
    const record = await repo().create("widgets", { label: "hello" });
    expect(record.label).toBe("hello");
    expect(record).not.toHaveProperty("workspace_id");

    const updated = await repo().update("widgets", record.id as string, {
      label: "changed",
    });
    expect(updated?.label).toBe("changed");

    await expect(repo().remove("widgets", record.id as string)).resolves.toBe(
      true
    );
  });

  it("lists only this workspace's rows", async () => {
    await repo().create("contacts", { name: "Mine" });

    const db = getControlPlaneDb();
    const { sql } = await import("drizzle-orm");
    await db.execute(
      sql`INSERT INTO public.contacts (name, workspace_id) VALUES ('Theirs', ${WORKSPACE_B})`
    );

    const { records, total } = await repo().list("contacts", {
      limit: 50,
      offset: 0,
      orderDirection: "asc",
      includeLabels: false,
      filters: {},
    });

    expect(total).toBe(1);
    expect(records.map((r) => r.name)).toEqual(["Mine"]);
  });

  it("404s for a table that is not in the config registry", async () => {
    await expect(repo().create("nope", { name: "x" })).rejects.toThrow(
      /Table configuration not found/
    );
  });
});

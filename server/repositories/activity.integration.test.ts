import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests for the audit-log / event-log readers.
 *
 * Skipped unless `TEST_POSTGRES_URL` is set — see
 * docs/API_CONTROL_PLANE.md for how to stand up the database.
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

const { getAuditLog, getEvent, listAuditLogs, listEvents } = await import(
  "./activity"
);
const { writeAuditLog } = await import("@/server/lib/audit");
const { emitEvent } = await import("@/server/lib/events");
const { getControlPlaneDb, closeControlPlaneDb } = await import(
  "@/server/lib/db"
);

describeIfDb("activity readers (integration)", () => {
  beforeAll(async () => {
    const { sql } = await import("drizzle-orm");
    const db = getControlPlaneDb();
    await db.execute(
      sql`DELETE FROM public.audit_logs WHERE workspace_id IN (${WORKSPACE_A}, ${WORKSPACE_B})`
    );
    await db.execute(
      sql`DELETE FROM public.event_logs WHERE workspace_id IN (${WORKSPACE_A}, ${WORKSPACE_B})`
    );

    // Three entries in workspace A, written in order, plus one in B.
    for (const action of ["data.created", "data.updated", "data.deleted"]) {
      await writeAuditLog({
        action,
        actorUserId: ACTOR,
        changes: { action },
        requestId: `req-${action}`,
        resourceId: "rec-1",
        resourceType: "contacts",
        workspaceId: WORKSPACE_A,
      });
      // Distinct created_at values so ordering is unambiguous.
      await new Promise((resolve) => setTimeout(resolve, 12));
    }

    await writeAuditLog({
      action: "data.created",
      actorUserId: ACTOR,
      resourceId: "rec-b",
      resourceType: "other",
      workspaceId: WORKSPACE_B,
    });

    await emitEvent({
      actorUserId: ACTOR,
      eventName: "db.contacts.created",
      payload: { record: { id: "rec-1" } },
      requestId: "req-evt",
      workspaceId: WORKSPACE_A,
    });
    await emitEvent({
      actorUserId: ACTOR,
      eventName: "db.other.created",
      payload: {},
      workspaceId: WORKSPACE_B,
    });
  });

  afterAll(async () => {
    await closeControlPlaneDb();
  });

  it("returns audit entries newest first", async () => {
    const entries = await listAuditLogs(WORKSPACE_A);

    expect(entries.map((e) => e.action)).toEqual([
      "data.deleted",
      "data.updated",
      "data.created",
    ]);
  });

  it("scopes audit entries to the workspace", async () => {
    const entries = await listAuditLogs(WORKSPACE_A);
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.resourceType === "contacts")).toBe(true);

    const bEntries = await listAuditLogs(WORKSPACE_B);
    expect(bEntries).toHaveLength(1);
    expect(bEntries[0].resourceType).toBe("other");
  });

  it("resolves the actor's email through the join", async () => {
    const [entry] = await listAuditLogs(WORKSPACE_A);
    expect(entry.actorUserId).toBe(ACTOR);
    expect(entry.actorEmail).toBe("a@example.com");
  });

  it("honours the limit", async () => {
    const entries = await listAuditLogs(WORKSPACE_A, { limit: 2 });
    expect(entries).toHaveLength(2);
    expect(entries[0].action).toBe("data.deleted");
  });

  it("keyset-paginates with before", async () => {
    const first = await listAuditLogs(WORKSPACE_A, { limit: 1 });
    const next = await listAuditLogs(WORKSPACE_A, {
      before: first[0].createdAt.toISOString(),
      limit: 10,
    });

    expect(next.map((e) => e.action)).toEqual(["data.updated", "data.created"]);
  });

  it("rejects a bad limit or cursor", async () => {
    await expect(listAuditLogs(WORKSPACE_A, { limit: 0 })).rejects.toThrow();
    await expect(listAuditLogs(WORKSPACE_A, { limit: 9999 })).rejects.toThrow();
    await expect(
      listAuditLogs(WORKSPACE_A, { before: "not-a-date" })
    ).rejects.toThrow();
  });

  it("fetches a single audit entry, scoped by workspace", async () => {
    const [entry] = await listAuditLogs(WORKSPACE_A);

    const found = await getAuditLog(WORKSPACE_A, entry.id);
    expect(found?.id).toBe(entry.id);
    expect(found?.changes).toEqual({ action: "data.deleted" });

    // The same id from another workspace must not resolve.
    expect(await getAuditLog(WORKSPACE_B, entry.id)).toBeNull();
  });

  it("lists events newest first and scopes them", async () => {
    const entries = await listEvents(WORKSPACE_A);
    expect(entries).toHaveLength(1);
    expect(entries[0].eventName).toBe("db.contacts.created");
    expect(entries[0].payload).toEqual({ record: { id: "rec-1" } });
  });

  it("fetches a single event, scoped by workspace", async () => {
    const [event] = await listEvents(WORKSPACE_A);

    expect((await getEvent(WORKSPACE_A, event.id))?.id).toBe(event.id);
    expect(await getEvent(WORKSPACE_B, event.id)).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    const missing = "00000000-0000-0000-0000-000000000000";
    expect(await getAuditLog(WORKSPACE_A, missing)).toBeNull();
    expect(await getEvent(WORKSPACE_A, missing)).toBeNull();
  });
});

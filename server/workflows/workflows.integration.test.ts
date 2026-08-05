import { beforeAll, afterAll, describe, expect, it } from "vitest";

/**
 * Integration tests for transactional fan-out and the workflow worker.
 * Skipped unless `TEST_POSTGRES_URL` is set.
 */

const TEST_DB = process.env.TEST_POSTGRES_URL;
const describeIfDb = TEST_DB ? describe : describe.skip;

const WORKSPACE = "aaaaaaaa-0000-0000-0000-000000000001";
const ACTOR = "11111111-1111-1111-1111-111111111111";

if (TEST_DB) {
  process.env.POSTGRES_URL = TEST_DB;
  process.env.APP_MODE = "local";
}

const { emitEvent } = await import("@/server/lib/events");
const { getControlPlaneDb, closeControlPlaneDb } = await import(
  "@/server/lib/db"
);
const { processDueSchedules } = await import("./worker");

describeIfDb("workflows fan-out and worker (integration)", () => {
  beforeAll(async () => {
    const { sql } = await import("drizzle-orm");
    const db = getControlPlaneDb();

    await db.execute(
      sql`DELETE FROM public.workflow_runs WHERE workspace_id = ${WORKSPACE}`
    );
    await db.execute(
      sql`DELETE FROM public.workflow_schedule WHERE workspace_id = ${WORKSPACE}`
    );
    await db.execute(
      sql`DELETE FROM public.workflows WHERE workspace_id = ${WORKSPACE}`
    );
    await db.execute(
      sql`DELETE FROM public.event_logs WHERE workspace_id = ${WORKSPACE}`
    );

    await db.execute(sql`
      INSERT INTO public.workflows (
        id, workspace_id, name, enabled, trigger_type, event_name, steps, created_by
      ) VALUES (
        'bbbbbbbb-0000-0000-0000-000000000010',
        ${WORKSPACE},
        'On contact created',
        true,
        'event',
        'db.contacts.created',
        ${JSON.stringify([
          {
            type: "condition",
            label: "always pass",
            input: { left: "1", operator: "equals", right: "1" },
          },
        ])}::jsonb,
        ${ACTOR}
      )
    `);
  });

  afterAll(async () => {
    await closeControlPlaneDb();
  });

  it("fans out a matching workflow into workflow_schedule in the same emit", async () => {
    await emitEvent({
      workspaceId: WORKSPACE,
      eventName: "db.contacts.created",
      payload: { record: { id: "c1" } },
      actorUserId: ACTOR,
      requestId: "wf-test-1",
    });

    const { sql } = await import("drizzle-orm");
    const db = getControlPlaneDb();

    const events = (await db.execute(
      sql`SELECT id FROM public.event_logs WHERE request_id = 'wf-test-1'`
    )) as Array<{ id: string }>;
    expect(events).toHaveLength(1);

    const schedules = (await db.execute(
      sql`SELECT workflow_id, event_id, status, trigger_source
          FROM public.workflow_schedule
          WHERE event_id = ${events[0].id}`
    )) as Array<Record<string, unknown>>;

    expect(schedules).toHaveLength(1);
    expect(schedules[0].workflow_id).toBe(
      "bbbbbbbb-0000-0000-0000-000000000010"
    );
    expect(schedules[0].status).toBe("pending");
    expect(schedules[0].trigger_source).toBe("event");
  });

  it("does not schedule for a workflow created after the event", async () => {
    const { sql } = await import("drizzle-orm");
    const db = getControlPlaneDb();

    await emitEvent({
      workspaceId: WORKSPACE,
      eventName: "db.contacts.updated",
      payload: {},
      actorUserId: ACTOR,
      requestId: "wf-test-2",
    });

    await db.execute(sql`
      INSERT INTO public.workflows (
        id, workspace_id, name, enabled, trigger_type, event_name, steps
      ) VALUES (
        'bbbbbbbb-0000-0000-0000-000000000011',
        ${WORKSPACE},
        'Late workflow',
        true,
        'event',
        'db.contacts.updated',
        '[]'::jsonb
      )
    `);

    const schedules = (await db.execute(
      sql`SELECT id FROM public.workflow_schedule
          WHERE workflow_id = 'bbbbbbbb-0000-0000-0000-000000000011'`
    )) as unknown[];

    expect(schedules).toHaveLength(0);
  });

  it("claims and completes a due schedule", async () => {
    // Give the nudge a moment, then process explicitly.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const result = await processDueSchedules({ limit: 10 });
    expect(result.claimed).toBeGreaterThanOrEqual(1);

    const { sql } = await import("drizzle-orm");
    const db = getControlPlaneDb();
    const runs = (await db.execute(
      sql`SELECT status FROM public.workflow_runs
          WHERE workflow_id = 'bbbbbbbb-0000-0000-0000-000000000010'`
    )) as Array<{ status: string }>;

    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs.some((run) => run.status === "succeeded")).toBe(true);
  });
});

import { and, eq, sql } from "drizzle-orm";
import { eventLog, workflow, workflowSchedule } from "@/lib/db/schema";
import { getControlPlaneDb } from "@/server/lib/db";
import { MAX_WORKFLOW_DEPTH } from "@/server/workflows/constants";
import { scheduleTick } from "@/server/workflows/nudge";

/**
 * Technical events emitted by the base data repository for every row mutation.
 * Product events (`order.cancelled`, `signup.accepted`, …) and workflow
 * lifecycle events are named per domain and emitted where the business meaning
 * is known.
 */
export type SystemEventName =
  | `db.${string}.created`
  | `db.${string}.updated`
  | `db.${string}.deleted`;

export type EventInput = {
  workspaceId: string;
  eventName: SystemEventName | string;
  payload?: Record<string, unknown>;
  actorUserId?: string | null;
  requestId?: string | null;
  /** When set, schedule rows inherit depth + 1 for the recursion guard. */
  causedByRunId?: string | null;
};

/**
 * Inserts a fact into `event_logs` and fans out matching enabled workflows into
 * `workflow_schedule` in one transaction.
 *
 * This function is the contract — anything that inserts into `event_logs`
 * directly silently skips fan-out. Never throws: a failed emit must not fail
 * the mutation that produced it.
 */
export async function emitEvent(event: EventInput): Promise<void> {
  try {
    const db = getControlPlaneDb();

    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(eventLog)
        .values({
          workspace_id: event.workspaceId,
          event_name: event.eventName,
          payload: event.payload ?? {},
          actor_user_id: event.actorUserId ?? null,
          request_id: event.requestId ?? null,
          caused_by_run_id: event.causedByRunId ?? null,
        })
        .returning({
          id: eventLog.id,
          causedByRunId: eventLog.caused_by_run_id,
        });

      if (!inserted) {
        return;
      }

      let depth = 0;
      if (inserted.causedByRunId) {
        const depthRows = (await tx.execute(sql`
          SELECT COALESCE(ws.depth, 0) AS depth
          FROM public.workflow_runs wr
          LEFT JOIN public.workflow_schedule ws ON ws.id = wr.schedule_id
          WHERE wr.id = ${inserted.causedByRunId}
          LIMIT 1
        `)) as Array<{ depth: number }>;
        depth = Number(depthRows[0]?.depth ?? 0) + 1;
      }

      if (depth > MAX_WORKFLOW_DEPTH) {
        return;
      }

      const matches = await tx
        .select({
          id: workflow.id,
          steps: workflow.steps,
        })
        .from(workflow)
        .where(
          and(
            eq(workflow.workspace_id, event.workspaceId),
            eq(workflow.enabled, true),
            eq(workflow.trigger_type, "event"),
            eq(workflow.event_name, event.eventName)
          )
        );

      for (const match of matches) {
        await tx
          .insert(workflowSchedule)
          .values({
            workspace_id: event.workspaceId,
            workflow_id: match.id,
            event_id: inserted.id,
            status: "pending",
            trigger_source: "event",
            context: {
              event: {
                id: inserted.id,
                name: event.eventName,
                payload: event.payload ?? {},
              },
              steps: [],
            },
            depth,
            actor_user_id: event.actorUserId ?? null,
            request_id: event.requestId ?? null,
          })
          .onConflictDoNothing();
      }
    });

    scheduleTick();
  } catch (error) {
    console.error("[events] failed to emit event", {
      eventName: event.eventName,
      requestId: event.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

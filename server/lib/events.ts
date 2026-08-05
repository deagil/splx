import { eventOutbox } from "@/lib/db/schema";
import { getControlPlaneDb } from "./db";

/**
 * Technical events emitted by the base data repository for every row mutation.
 * Product events (`order.cancelled`, `signup.accepted`, …) are named per domain
 * and emitted from handlers or `lib/server/*`, where the business meaning is
 * known.
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
};

/**
 * Inserts an event into `event_outbox` in the main database.
 *
 * Never throws — a failed emit must not fail the mutation that produced it.
 * Nothing drains the outbox yet; a future automation runner will poll for rows
 * with `processed_at IS NULL` (see the partial index on that column).
 */
export async function emitEvent(event: EventInput): Promise<void> {
  try {
    await getControlPlaneDb()
      .insert(eventOutbox)
      .values({
        workspace_id: event.workspaceId,
        event_name: event.eventName,
        payload: event.payload ?? {},
        actor_user_id: event.actorUserId ?? null,
        request_id: event.requestId ?? null,
      });
  } catch (error) {
    console.error("[events] failed to emit event", {
      eventName: event.eventName,
      requestId: event.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

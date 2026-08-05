import { auditLog } from "@/lib/db/schema";
import type { DbClient } from "@/lib/server/tenant/context";

export type AuditEntry = {
  workspaceId: string;
  actorUserId?: string | null;
  /** Verb in dot notation, e.g. `data.created`. */
  action: string;
  /** Logical resource — for row CRUD this is the table config id. */
  resourceType: string;
  resourceId?: string | null;
  changes?: Record<string, unknown>;
  requestId?: string | null;
};

/**
 * Appends a row to `audit_logs`.
 *
 * Never throws: a failed audit write must not fail the mutation it describes.
 * It is logged at error level, because a silent gap in the audit trail is worse
 * than a noisy one — if audit writes start failing, that needs to be visible.
 */
export async function writeAuditLog(
  db: DbClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      workspace_id: entry.workspaceId,
      actor_user_id: entry.actorUserId ?? null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      changes: entry.changes ?? {},
      request_id: entry.requestId ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", {
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      requestId: entry.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

import { auditLog } from "@/lib/db/schema";
import { getControlPlaneDb } from "./db";

export interface AuditEntry {
  /** Verb in dot notation, e.g. `data.created`, `pages.updated`. */
  action: string;
  actorUserId?: string | null;
  changes?: Record<string, unknown>;
  requestId?: string | null;
  resourceId?: string | null;
  /** Logical resource — for row CRUD this is the table config id. */
  resourceType: string;
  workspaceId: string;
}

/**
 * Appends a row to `audit_logs` in the main database.
 *
 * Never throws: a failed audit write must not fail the mutation it describes.
 * It is logged at error level, because a silent gap in the audit trail is worse
 * than a noisy one — if audit writes start failing, that needs to be visible.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await getControlPlaneDb()
      .insert(auditLog)
      .values({
        action: entry.action,
        actor_user_id: entry.actorUserId ?? null,
        changes: entry.changes ?? {},
        request_id: entry.requestId ?? null,
        resource_id: entry.resourceId ?? null,
        resource_type: entry.resourceType,
        workspace_id: entry.workspaceId,
      });
  } catch (error) {
    console.error("[audit] failed to write audit log", {
      action: entry.action,
      error: error instanceof Error ? error.message : String(error),
      requestId: entry.requestId,
      resourceId: entry.resourceId,
      resourceType: entry.resourceType,
    });
  }
}

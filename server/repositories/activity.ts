import { and, desc, eq, lt } from "drizzle-orm";
import { auditLog, eventOutbox, user } from "@/lib/db/schema";
import { ApiError } from "@/server/api/responses";
import { getControlPlaneDb } from "@/server/lib/db";

/**
 * Read access to the control plane's own output: `audit_logs` and
 * `event_outbox`.
 *
 * Both tables are append-only and workspace-scoped, and both are written
 * through the privileged main-database connection, so these are the only way to
 * see them from the app.
 *
 * Reads are keyset-paginated on `created_at` rather than offset-paginated:
 * these tables only grow, and an offset query drifts as rows are appended
 * underneath it.
 */

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export type AuditLogEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  changes: Record<string, unknown>;
  requestId: string | null;
  createdAt: Date;
  actorUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
};

export type EventEntry = {
  id: string;
  eventName: string;
  payload: Record<string, unknown>;
  requestId: string | null;
  attempts: number;
  processedAt: Date | null;
  createdAt: Date;
  actorUserId: string | null;
  actorEmail: string | null;
};

export type ListOptions = {
  limit?: number;
  /** Keyset cursor: return rows strictly older than this timestamp. */
  before?: string;
};

function parseLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ApiError(400, `limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

function parseBefore(before: string | undefined): Date | null {
  if (!before) {
    return null;
  }
  const date = new Date(before);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "before must be an ISO timestamp");
  }
  return date;
}

function actorName(
  firstname: string | null,
  lastname: string | null
): string | null {
  const parts = [firstname, lastname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function listAuditLogs(
  workspaceId: string,
  options: ListOptions = {}
): Promise<AuditLogEntry[]> {
  const limit = parseLimit(options.limit);
  const before = parseBefore(options.before);

  const where = before
    ? and(
        eq(auditLog.workspace_id, workspaceId),
        lt(auditLog.created_at, before)
      )
    : eq(auditLog.workspace_id, workspaceId);

  const rows = await getControlPlaneDb()
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resource_type,
      resourceId: auditLog.resource_id,
      changes: auditLog.changes,
      requestId: auditLog.request_id,
      createdAt: auditLog.created_at,
      actorUserId: auditLog.actor_user_id,
      actorEmail: user.email,
      actorFirstname: user.firstname,
      actorLastname: user.lastname,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actor_user_id))
    .where(where)
    .orderBy(desc(auditLog.created_at))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    changes: (row.changes ?? {}) as Record<string, unknown>,
    requestId: row.requestId,
    createdAt: row.createdAt,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
    actorName: actorName(row.actorFirstname, row.actorLastname),
  }));
}

export async function listEvents(
  workspaceId: string,
  options: ListOptions = {}
): Promise<EventEntry[]> {
  const limit = parseLimit(options.limit);
  const before = parseBefore(options.before);

  const where = before
    ? and(
        eq(eventOutbox.workspace_id, workspaceId),
        lt(eventOutbox.created_at, before)
      )
    : eq(eventOutbox.workspace_id, workspaceId);

  const rows = await getControlPlaneDb()
    .select({
      id: eventOutbox.id,
      eventName: eventOutbox.event_name,
      payload: eventOutbox.payload,
      requestId: eventOutbox.request_id,
      attempts: eventOutbox.attempts,
      processedAt: eventOutbox.processed_at,
      createdAt: eventOutbox.created_at,
      actorUserId: eventOutbox.actor_user_id,
      actorEmail: user.email,
    })
    .from(eventOutbox)
    .leftJoin(user, eq(user.id, eventOutbox.actor_user_id))
    .where(where)
    .orderBy(desc(eventOutbox.created_at))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    eventName: row.eventName,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    requestId: row.requestId,
    attempts: row.attempts,
    processedAt: row.processedAt,
    createdAt: row.createdAt,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
  }));
}

/** Scoped by workspace so an id from another workspace 404s rather than leaks. */
export async function getAuditLog(
  workspaceId: string,
  id: string
): Promise<AuditLogEntry | null> {
  const rows = await getControlPlaneDb()
    .select({
      id: auditLog.id,
      action: auditLog.action,
      resourceType: auditLog.resource_type,
      resourceId: auditLog.resource_id,
      changes: auditLog.changes,
      requestId: auditLog.request_id,
      createdAt: auditLog.created_at,
      actorUserId: auditLog.actor_user_id,
      actorEmail: user.email,
      actorFirstname: user.firstname,
      actorLastname: user.lastname,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actor_user_id))
    .where(and(eq(auditLog.id, id), eq(auditLog.workspace_id, workspaceId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    changes: (row.changes ?? {}) as Record<string, unknown>,
    requestId: row.requestId,
    createdAt: row.createdAt,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
    actorName: actorName(row.actorFirstname, row.actorLastname),
  };
}

export async function getEvent(
  workspaceId: string,
  id: string
): Promise<EventEntry | null> {
  const rows = await getControlPlaneDb()
    .select({
      id: eventOutbox.id,
      eventName: eventOutbox.event_name,
      payload: eventOutbox.payload,
      requestId: eventOutbox.request_id,
      attempts: eventOutbox.attempts,
      processedAt: eventOutbox.processed_at,
      createdAt: eventOutbox.created_at,
      actorUserId: eventOutbox.actor_user_id,
      actorEmail: user.email,
    })
    .from(eventOutbox)
    .leftJoin(user, eq(user.id, eventOutbox.actor_user_id))
    .where(
      and(eq(eventOutbox.id, id), eq(eventOutbox.workspace_id, workspaceId))
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    eventName: row.eventName,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    requestId: row.requestId,
    attempts: row.attempts,
    processedAt: row.processedAt,
    createdAt: row.createdAt,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
  };
}

export const __testing = { parseLimit, parseBefore, actorName };

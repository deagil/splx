import { and, desc, eq, lt } from "drizzle-orm";
import { auditLog, eventLog, user } from "@/lib/db/schema";
import { ApiError } from "@/server/api/responses";
import { getControlPlaneDb } from "@/server/lib/db";

/**
 * Read access to the control plane's own output: `audit_logs` and
 * `event_logs`.
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

export interface AuditLogEntry {
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  actorUserId: string | null;
  changes: Record<string, unknown>;
  createdAt: Date;
  id: string;
  requestId: string | null;
  resourceId: string | null;
  resourceType: string;
}

export interface EventEntry {
  actorEmail: string | null;
  actorUserId: string | null;
  causedByRunId: string | null;
  createdAt: Date;
  eventName: string;
  id: string;
  payload: Record<string, unknown>;
  requestId: string | null;
}

export interface ListOptions {
  /** Keyset cursor: return rows strictly older than this timestamp. */
  before?: string;
  limit?: number;
}

function parseLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ApiError(
      400,
      `limit must be an integer between 1 and ${MAX_LIMIT}`
    );
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
      action: auditLog.action,
      actorEmail: user.email,
      actorFirstname: user.firstname,
      actorLastname: user.lastname,
      actorUserId: auditLog.actor_user_id,
      changes: auditLog.changes,
      createdAt: auditLog.created_at,
      id: auditLog.id,
      requestId: auditLog.request_id,
      resourceId: auditLog.resource_id,
      resourceType: auditLog.resource_type,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actor_user_id))
    .where(where)
    .orderBy(desc(auditLog.created_at))
    .limit(limit);

  return rows.map((row) => ({
    action: row.action,
    actorEmail: row.actorEmail,
    actorName: actorName(row.actorFirstname, row.actorLastname),
    actorUserId: row.actorUserId,
    changes: (row.changes ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    id: row.id,
    requestId: row.requestId,
    resourceId: row.resourceId,
    resourceType: row.resourceType,
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
        eq(eventLog.workspace_id, workspaceId),
        lt(eventLog.created_at, before)
      )
    : eq(eventLog.workspace_id, workspaceId);

  const rows = await getControlPlaneDb()
    .select({
      actorEmail: user.email,
      actorUserId: eventLog.actor_user_id,
      causedByRunId: eventLog.caused_by_run_id,
      createdAt: eventLog.created_at,
      eventName: eventLog.event_name,
      id: eventLog.id,
      payload: eventLog.payload,
      requestId: eventLog.request_id,
    })
    .from(eventLog)
    .leftJoin(user, eq(user.id, eventLog.actor_user_id))
    .where(where)
    .orderBy(desc(eventLog.created_at))
    .limit(limit);

  return rows.map((row) => ({
    actorEmail: row.actorEmail,
    actorUserId: row.actorUserId,
    causedByRunId: row.causedByRunId,
    createdAt: row.createdAt,
    eventName: row.eventName,
    id: row.id,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    requestId: row.requestId,
  }));
}

/** Scoped by workspace so an id from another workspace 404s rather than leaks. */
export async function getAuditLog(
  workspaceId: string,
  id: string
): Promise<AuditLogEntry | null> {
  const rows = await getControlPlaneDb()
    .select({
      action: auditLog.action,
      actorEmail: user.email,
      actorFirstname: user.firstname,
      actorLastname: user.lastname,
      actorUserId: auditLog.actor_user_id,
      changes: auditLog.changes,
      createdAt: auditLog.created_at,
      id: auditLog.id,
      requestId: auditLog.request_id,
      resourceId: auditLog.resource_id,
      resourceType: auditLog.resource_type,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actor_user_id))
    .where(and(eq(auditLog.id, id), eq(auditLog.workspace_id, workspaceId)))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    action: row.action,
    actorEmail: row.actorEmail,
    actorName: actorName(row.actorFirstname, row.actorLastname),
    actorUserId: row.actorUserId,
    changes: (row.changes ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    id: row.id,
    requestId: row.requestId,
    resourceId: row.resourceId,
    resourceType: row.resourceType,
  };
}

export async function getEvent(
  workspaceId: string,
  id: string
): Promise<EventEntry | null> {
  const rows = await getControlPlaneDb()
    .select({
      actorEmail: user.email,
      actorUserId: eventLog.actor_user_id,
      causedByRunId: eventLog.caused_by_run_id,
      createdAt: eventLog.created_at,
      eventName: eventLog.event_name,
      id: eventLog.id,
      payload: eventLog.payload,
      requestId: eventLog.request_id,
    })
    .from(eventLog)
    .leftJoin(user, eq(user.id, eventLog.actor_user_id))
    .where(and(eq(eventLog.id, id), eq(eventLog.workspace_id, workspaceId)))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    actorEmail: row.actorEmail,
    actorUserId: row.actorUserId,
    causedByRunId: row.causedByRunId,
    createdAt: row.createdAt,
    eventName: row.eventName,
    id: row.id,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    requestId: row.requestId,
  };
}

export const __testing = { actorName, parseBefore, parseLimit };

import { and, asc, eq } from "drizzle-orm";
import { eventType } from "@/lib/db/schema";
import { ApiError } from "@/server/api/responses";
import { getControlPlaneDb } from "@/server/lib/db";

const SYSTEM_EVENT_TYPES: Array<{ name: string; description: string }> = [
  {
    name: "workflow.run.succeeded",
    description: "A workflow run completed successfully",
  },
  {
    name: "workflow.run.failed",
    description:
      "A workflow run failed after exhausting retries or on a permanent error",
  },
  {
    name: "db.*.created",
    description:
      "Pattern: a row was created in a data table (actual events use db.<table>.created)",
  },
  {
    name: "db.*.updated",
    description:
      "Pattern: a row was updated in a data table (actual events use db.<table>.updated)",
  },
  {
    name: "db.*.deleted",
    description:
      "Pattern: a row was deleted from a data table (actual events use db.<table>.deleted)",
  },
];

export type EventTypeRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  payloadSchema: Record<string, unknown>;
  isSystem: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: typeof eventType.$inferSelect): EventTypeRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    payloadSchema: (row.payload_schema ?? {}) as Record<string, unknown>,
    isSystem: row.is_system,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureSystemTypes(workspaceId: string): Promise<void> {
  const db = getControlPlaneDb();
  for (const entry of SYSTEM_EVENT_TYPES) {
    await db
      .insert(eventType)
      .values({
        workspace_id: workspaceId,
        name: entry.name,
        description: entry.description,
        is_system: true,
        payload_schema: {},
      })
      .onConflictDoNothing({
        target: [eventType.workspace_id, eventType.name],
      });
  }
}

export async function listEventTypes(
  workspaceId: string
): Promise<EventTypeRecord[]> {
  await ensureSystemTypes(workspaceId);

  const rows = await getControlPlaneDb()
    .select()
    .from(eventType)
    .where(eq(eventType.workspace_id, workspaceId))
    .orderBy(asc(eventType.name));

  return rows.map(mapRow);
}

export async function createEventType(
  workspaceId: string,
  actorUserId: string,
  input: {
    name: string;
    description?: string | null;
    payloadSchema?: Record<string, unknown>;
  }
): Promise<EventTypeRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new ApiError(400, "name is required");
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_.*-]*$/.test(name)) {
    throw new ApiError(
      400,
      "name must start with a letter and use letters, numbers, ., _, -, or *"
    );
  }

  try {
    const [row] = await getControlPlaneDb()
      .insert(eventType)
      .values({
        workspace_id: workspaceId,
        name,
        description: input.description ?? null,
        payload_schema: input.payloadSchema ?? {},
        is_system: false,
        created_by: actorUserId,
      })
      .returning();

    if (!row) {
      throw new ApiError(500, "Failed to create event type");
    }

    return mapRow(row);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("event_types_workspace_name_uniq")
    ) {
      throw new ApiError(409, "An event type with that name already exists");
    }
    throw error;
  }
}

export async function updateEventType(
  workspaceId: string,
  id: string,
  input: {
    description?: string | null;
    payloadSchema?: Record<string, unknown>;
  }
): Promise<EventTypeRecord | null> {
  const [existing] = await getControlPlaneDb()
    .select()
    .from(eventType)
    .where(and(eq(eventType.id, id), eq(eventType.workspace_id, workspaceId)))
    .limit(1);

  if (!existing) {
    return null;
  }

  const [row] = await getControlPlaneDb()
    .update(eventType)
    .set({
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      payload_schema:
        input.payloadSchema !== undefined
          ? input.payloadSchema
          : existing.payload_schema,
      updated_at: new Date(),
    })
    .where(and(eq(eventType.id, id), eq(eventType.workspace_id, workspaceId)))
    .returning();

  return row ? mapRow(row) : null;
}

export async function deleteEventType(
  workspaceId: string,
  id: string
): Promise<boolean> {
  const [existing] = await getControlPlaneDb()
    .select()
    .from(eventType)
    .where(and(eq(eventType.id, id), eq(eventType.workspace_id, workspaceId)))
    .limit(1);

  if (!existing) {
    return false;
  }
  if (existing.is_system) {
    throw new ApiError(400, "System event types cannot be deleted");
  }

  const rows = await getControlPlaneDb()
    .delete(eventType)
    .where(and(eq(eventType.id, id), eq(eventType.workspace_id, workspaceId)))
    .returning({ id: eventType.id });

  return rows.length > 0;
}

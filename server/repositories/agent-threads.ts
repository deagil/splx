import { and, desc, eq } from "drizzle-orm";
import { agentThread } from "@/lib/db/schema";
import {
  type AgentThreadRecord,
  type AgentThreadState,
  type AgentThreadSummary,
  EMPTY_AGENT_THREAD_STATE,
  isAgentThreadState,
  truncateThreadTitle,
} from "@/lib/types/agent-thread";
import { getControlPlaneDb } from "@/server/lib/db";

const LIST_LIMIT = 50;

type AgentThreadRow = typeof agentThread.$inferSelect;

function toState(value: unknown): AgentThreadState {
  return isAgentThreadState(value) ? value : EMPTY_AGENT_THREAD_STATE;
}

function toSummary(row: AgentThreadRow): AgentThreadSummary {
  return {
    createdAt: row.created_at.toISOString(),
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at.toISOString(),
  };
}

function toRecord(row: AgentThreadRow): AgentThreadRecord {
  return { ...toSummary(row), state: toState(row.state) };
}

/**
 * Merges an incoming snapshot onto the stored one.
 *
 * The event log is append-only from the server's point of view: a client that
 * reconnects mid-turn, or a title-only writer, can legitimately send a shorter
 * `events` array, and taking it verbatim would truncate the transcript. So the
 * longer log always wins, and the cursor only moves forward.
 */
export function mergeAgentThreadState(
  existing: AgentThreadState,
  incoming: AgentThreadState
): AgentThreadState {
  const events =
    incoming.events.length >= existing.events.length
      ? incoming.events
      : existing.events;

  return {
    events,
    session: {
      continuationToken:
        incoming.session.continuationToken ??
        existing.session.continuationToken,
      sessionId: incoming.session.sessionId ?? existing.session.sessionId,
      streamIndex: Math.max(
        incoming.session.streamIndex ?? 0,
        existing.session.streamIndex ?? 0
      ),
    },
  };
}

export async function listAgentThreads(
  workspaceId: string,
  userId: string
): Promise<AgentThreadSummary[]> {
  const rows = await getControlPlaneDb()
    .select()
    .from(agentThread)
    .where(
      and(
        eq(agentThread.workspace_id, workspaceId),
        eq(agentThread.user_id, userId)
      )
    )
    .orderBy(desc(agentThread.updated_at))
    .limit(LIST_LIMIT);

  return rows.map(toSummary);
}

export async function getAgentThread(
  workspaceId: string,
  userId: string,
  id: string
): Promise<AgentThreadRecord | null> {
  const [row] = await getControlPlaneDb()
    .select()
    .from(agentThread)
    .where(
      and(
        eq(agentThread.id, id),
        eq(agentThread.workspace_id, workspaceId),
        eq(agentThread.user_id, userId)
      )
    )
    .limit(1);

  return row ? toRecord(row) : null;
}

export interface CreateAgentThreadInput {
  id?: string;
  title?: string | null;
}

export async function createAgentThread(
  workspaceId: string,
  userId: string,
  input: CreateAgentThreadInput = {}
): Promise<AgentThreadRecord> {
  const title = input.title?.trim() ? truncateThreadTitle(input.title) : null;

  const [row] = await getControlPlaneDb()
    .insert(agentThread)
    .values({
      state: EMPTY_AGENT_THREAD_STATE,
      title,
      user_id: userId,
      workspace_id: workspaceId,
      ...(input.id ? { id: input.id } : {}),
    })
    .returning();

  return toRecord(row);
}

export interface UpdateAgentThreadInput {
  state?: AgentThreadState;
  title?: string | null;
}

export async function updateAgentThread(
  workspaceId: string,
  userId: string,
  id: string,
  patch: UpdateAgentThreadInput
): Promise<AgentThreadRecord | null> {
  const existing = await getAgentThread(workspaceId, userId, id);
  if (!existing) {
    return null;
  }

  const nextState = patch.state
    ? mergeAgentThreadState(existing.state, patch.state)
    : existing.state;

  const nextTitle =
    patch.title === undefined
      ? existing.title
      : patch.title === null
        ? null
        : truncateThreadTitle(patch.title);

  const [row] = await getControlPlaneDb()
    .update(agentThread)
    .set({
      state: nextState,
      title: nextTitle,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(agentThread.id, id),
        eq(agentThread.workspace_id, workspaceId),
        eq(agentThread.user_id, userId)
      )
    )
    .returning();

  return row ? toRecord(row) : null;
}

export async function deleteAgentThread(
  workspaceId: string,
  userId: string,
  id: string
): Promise<boolean> {
  const rows = await getControlPlaneDb()
    .delete(agentThread)
    .where(
      and(
        eq(agentThread.id, id),
        eq(agentThread.workspace_id, workspaceId),
        eq(agentThread.user_id, userId)
      )
    )
    .returning({ id: agentThread.id });

  return rows.length > 0;
}

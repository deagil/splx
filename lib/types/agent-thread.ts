/**
 * Thread state for the eve sidebar agent.
 *
 * Shared by the client (which replays it into `initialEvents` /
 * `initialSession`) and the server (which stores it verbatim in
 * `agent_threads.state`). Deliberately structural rather than importing eve's
 * `HandleMessageStreamEvent`: this type crosses the JSON boundary, and the
 * repository must be able to merge two snapshots without understanding a
 * single event.
 */

/** Where the client is in eve's stream. Enough to resume a live turn. */
export interface EveSessionCursor {
  continuationToken?: string;
  sessionId?: string;
  streamIndex: number;
}

export interface AgentThreadState {
  events: unknown[];
  session: EveSessionCursor;
}

export interface AgentThreadSummary {
  createdAt: string;
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface AgentThreadRecord extends AgentThreadSummary {
  state: AgentThreadState;
}

export const EMPTY_AGENT_THREAD_STATE: AgentThreadState = {
  events: [],
  session: { streamIndex: 0 },
};

/** Titles are derived from the first user message; keep them one line. */
export function truncateThreadTitle(text: string, maxLength = 60): string {
  const line = text.trim().split("\n")[0]?.trim() || "New chat";
  if (line.length <= maxLength) {
    return line;
  }
  return `${line.slice(0, maxLength - 1)}…`;
}

export function isAgentThreadState(value: unknown): value is AgentThreadState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<AgentThreadState>;
  return (
    Array.isArray(candidate.events) &&
    typeof candidate.session === "object" &&
    candidate.session !== null
  );
}

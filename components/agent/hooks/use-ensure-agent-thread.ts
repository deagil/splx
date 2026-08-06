import type { AgentThreadRecord } from "@/lib/types/agent-thread";

interface ThreadResponse {
  data: { thread: AgentThreadRecord };
}

/**
 * GET the thread; on 404 POST-create with the same id so later PATCHes succeed.
 * Reuses the sidebar's `?chatId=` UUID as the agent_threads primary key.
 */
export async function ensureAgentThread(
  threadId: string
): Promise<AgentThreadRecord> {
  const existing = await fetch(`/api/v1/agent-threads/${threadId}`, {
    headers: { Accept: "application/json" },
    method: "GET",
  });

  if (existing.ok) {
    const body = (await existing.json()) as ThreadResponse;
    return body.data.thread;
  }

  if (existing.status !== 404) {
    const detail = await existing.text().catch(() => "");
    throw new Error(
      `Failed to load thread (${existing.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  const created = await fetch("/api/v1/agent-threads", {
    body: JSON.stringify({ id: threadId }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!created.ok) {
    const detail = await created.text().catch(() => "");
    throw new Error(
      `Failed to create thread (${created.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  const body = (await created.json()) as ThreadResponse;
  return body.data.thread;
}

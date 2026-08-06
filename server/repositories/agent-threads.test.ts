import { describe, expect, it } from "vitest";
import type { AgentThreadState } from "@/lib/types/agent-thread";
import { mergeAgentThreadState } from "./agent-threads";

function state(
  events: unknown[],
  session: Partial<AgentThreadState["session"]> = {}
): AgentThreadState {
  return { events, session: { streamIndex: events.length, ...session } };
}

describe("mergeAgentThreadState", () => {
  it("takes the incoming log when it has grown", () => {
    const merged = mergeAgentThreadState(state(["a"]), state(["a", "b"]));

    expect(merged.events).toEqual(["a", "b"]);
    expect(merged.session.streamIndex).toBe(2);
  });

  it("keeps the stored log when the incoming one is shorter", () => {
    // A client that reconnects mid-turn, or a title-only writer, can send a
    // shorter snapshot. Taking it verbatim would truncate the transcript.
    const merged = mergeAgentThreadState(state(["a", "b", "c"]), state([]));

    expect(merged.events).toEqual(["a", "b", "c"]);
  });

  it("never moves the stream cursor backwards", () => {
    const merged = mergeAgentThreadState(
      state(["a", "b", "c"], { streamIndex: 9 }),
      state(["a", "b", "c"], { streamIndex: 3 })
    );

    expect(merged.session.streamIndex).toBe(9);
  });

  it("carries the stored session identity when the client omits it", () => {
    const merged = mergeAgentThreadState(
      state(["a"], { continuationToken: "tok", sessionId: "sess" }),
      state(["a", "b"])
    );

    expect(merged.session.sessionId).toBe("sess");
    expect(merged.session.continuationToken).toBe("tok");
  });

  it("prefers the incoming session identity when the client supplies one", () => {
    const merged = mergeAgentThreadState(
      state(["a"], { sessionId: "old" }),
      state(["a", "b"], { sessionId: "new" })
    );

    expect(merged.session.sessionId).toBe("new");
  });
});

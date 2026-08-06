import type { QueryClient } from "@tanstack/react-query";

/**
 * Title generation is deferred for day one — no `/generate-title` route in
 * splx yet. Keep the export so `use-chat-session` can call on the same cadence
 * Agent C used; the no-op is intentional until §8 wires titles.
 */
export type GenerateTitleRequest =
  | { mode: "seed"; seedText: string; force?: boolean }
  | { mode: "refine"; force?: boolean };

export async function requestThreadTitleGeneration(
  _threadId: string,
  _body: GenerateTitleRequest,
  _queryClient: QueryClient
): Promise<void> {
  // Day-one stub: titles stay null / first-line truncates can be added later.
}

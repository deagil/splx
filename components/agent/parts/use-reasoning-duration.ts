"use client";

import { useElapsedSeconds } from "./use-elapsed-seconds";

/** Track how long a reasoning block streamed (client-side, live sessions only). */
export function useReasoningDuration(isStreaming: boolean): number | undefined {
  return useElapsedSeconds(isStreaming);
}

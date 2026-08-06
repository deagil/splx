"use client";

import { toast } from "sonner";
import {
  buildChatErrorReport,
  formatChatErrorMessage,
} from "@/components/agent/lib/chat-error-report";

const TOAST_DEDUPE_MS = 4000;

let lastToastKey = "";
let lastToastAt = 0;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Error details copied", { duration: 2500 });
  } catch {
    toast.error("Could not copy to clipboard", { duration: 4000 });
  }
}

export type ChatFailureMeta = {
  code?: string;
  details?: unknown;
  source?: string;
  turnId?: string;
};

/** Build an Error suitable for reports / banner from a stream failure payload. */
export function chatFailureFromEvent(input: {
  code: string;
  message: string;
  details?: unknown;
  turnId?: string;
  source: string;
}): Error {
  const error = new Error(input.message);
  error.name = input.code || "ChatError";
  Object.assign(error, {
    code: input.code,
    details: input.details,
    source: input.source,
    turnId: input.turnId,
  });
  return error;
}

/**
 * Sticky Sonner toast for chat failures. Safe to call on every failure event;
 * dedupes rapid duplicates (e.g. turn.failed + onError for the same failure).
 */
export function showChatErrorToast(
  error: Error,
  threadId: string,
  meta: ChatFailureMeta = {}
) {
  const key = error.message.slice(0, 240);
  const now = Date.now();
  if (key === lastToastKey && now - lastToastAt < TOAST_DEDUPE_MS) {
    return;
  }
  lastToastKey = key;
  lastToastAt = now;

  const report = buildChatErrorReport(error, threadId, meta);
  const summary = formatChatErrorMessage(error);

  toast.error("Chat error", {
    action: {
      label: "Copy details",
      onClick: () => {
        void copyText(report);
      },
    },
    closeButton: true,
    description: summary,
    duration: Number.POSITIVE_INFINITY,
    id: `chat-error-${now}`,
  });
}

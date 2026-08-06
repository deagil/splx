import { getStreamLogSnapshot } from "@/components/agent/hooks/use-stream-log";

function looksLikeHtmlDocument(message: string) {
  const trimmed = message.trimStart().slice(0, 200).toLowerCase();
  return (
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<html") ||
    (trimmed.includes("<title>") && trimmed.includes("</html>"))
  );
}

export function formatChatErrorMessage(error: Error) {
  const message = error.message;

  if (
    message.includes("compiled-agent-manifest") ||
    message.includes("LoadCompiledManifestError")
  ) {
    return "The agent was recompiled while this chat was in progress. Start a new chat, or restart the dev server if the problem persists.";
  }

  if (
    message.includes("GatewayRateLimitError") ||
    message.includes("rate-limited") ||
    message.includes("Free tier requests")
  ) {
    return "AI Gateway rate limit hit (often free-tier credits). Retry shortly, or top up AI Gateway credits on the Vercel team.";
  }

  // Eve's browser client uses the raw HTTP body as ClientError.message. A Next.js
  // not-found page is useless in the toast — surface status + a short hint instead.
  if (looksLikeHtmlDocument(message)) {
    const statusFromError = (error as Error & { status?: unknown }).status;
    const status =
      typeof statusFromError === "number"
        ? String(statusFromError)
        : /<title>([^<]*)<\/title>/i.exec(message)?.[1]?.includes("404")
          ? "404"
          : undefined;
    const title = /<title>([^<]*)<\/title>/i
      .exec(message)?.[1]
      ?.replace(/\s+/g, " ")
      .trim();

    if (status === "404" || title?.toLowerCase().includes("not found")) {
      return "Chat lost connection to the agent (404). Retry the message — if it keeps happening, hard-refresh and start a new chat.";
    }
    return status
      ? `Chat request failed (${status}). Retry the message; use Copy details if it persists.`
      : "Chat request failed with an unexpected HTML error page. Retry the message; use Copy details if it persists.";
  }

  if (message.length > 400) {
    return `${message.slice(0, 397).trimEnd()}…`;
  }

  return message;
}

function serializeUnknown(value: unknown, depth = 0): string {
  if (value == null) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    const parts = [`${value.name}: ${value.message}`];
    if (value.stack) {
      parts.push(value.stack);
    }
    const cause = (value as Error & { cause?: unknown }).cause;
    if (cause !== undefined && depth < 3) {
      parts.push(`Cause: ${serializeUnknown(cause, depth + 1)}`);
    }
    return parts.join("\n");
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export type ChatErrorReportMeta = {
  code?: string;
  details?: unknown;
  source?: string;
  turnId?: string;
};

export function buildChatErrorReport(
  error: Error,
  threadId?: string,
  meta: ChatErrorReportMeta = {}
): string {
  const { streamLog, turnEventCounts } = getStreamLogSnapshot();
  const href = typeof window === "undefined" ? "" : window.location.href;
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;

  const lines = [
    "Agent C chat error report",
    `Time: ${new Date().toISOString()}`,
    `URL: ${href}`,
    `Thread: ${threadId ?? "unknown"}`,
    `User-Agent: ${userAgent}`,
  ];

  if (meta.source) {
    lines.push(`Source: ${meta.source}`);
  }
  if (meta.turnId) {
    lines.push(`Turn: ${meta.turnId}`);
  }
  if (meta.code) {
    lines.push(`Code: ${meta.code}`);
  }

  lines.push(
    "",
    "Error message:",
    looksLikeHtmlDocument(error.message)
      ? `[HTML error page omitted — ${error.message.length} chars; title: ${
          /<title>([^<]*)<\/title>/i
            .exec(error.message)?.[1]
            ?.replace(/\s+/g, " ")
            .trim() ?? "unknown"
        }]`
      : error.message,
    "",
    "Friendly summary:",
    formatChatErrorMessage(error)
  );

  if (meta.details !== undefined) {
    lines.push("", "Details:", serializeUnknown(meta.details));
  }

  if (error.name && error.name !== "Error") {
    lines.push("", `Error name: ${error.name}`);
  }

  if (error.stack) {
    lines.push("", "Stack:", error.stack);
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause !== undefined) {
    lines.push("", "Cause:", serializeUnknown(cause));
  }

  const extraKeys = Object.keys(error).filter(
    (key) => !["name", "message", "stack", "cause"].includes(key)
  );
  if (extraKeys.length > 0) {
    const extras: Record<string, unknown> = {};
    for (const key of extraKeys) {
      extras[key] = (error as unknown as Record<string, unknown>)[key];
    }
    lines.push("", "Error extras:", serializeUnknown(extras));
  }

  if (Object.keys(turnEventCounts).length > 0) {
    lines.push("", "Turn event counts:", serializeUnknown(turnEventCounts));
  }

  if (streamLog.length > 0) {
    lines.push(
      "",
      "Recent stream events (newest first):",
      ...streamLog.map((entry) => {
        const ageMs = Date.now() - entry.at;
        return `- ${entry.type} (${ageMs}ms ago)`;
      })
    );
  }

  return lines.join("\n");
}

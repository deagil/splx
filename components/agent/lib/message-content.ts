import type { EveMessage, EveMessagePart } from "eve/react";

/**
 * The two message helpers that survived Agent C's `lib/citations.ts`.
 *
 * Everything else in that module was hostname matching for its connectors and
 * the `citation` / `cite-mark` Streamdown tags — research-agent domain that did
 * not come over. These two are about message completeness, not sources.
 */

/** Flatten an assistant message's text parts, for the Copy action. */
export function getAssistantMarkdown(message: EveMessage): string {
  return message.parts
    .filter(
      (part): part is Extract<EveMessagePart, { type: "text" }> =>
        part.type === "text"
    )
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}

/** True once nothing in the message is still streaming. Gates the footer. */
export function isAssistantMessageComplete(message: EveMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }
  if (message.metadata?.status === "streaming") {
    return false;
  }
  return !message.parts.some(
    (part) =>
      (part.type === "text" || part.type === "reasoning") &&
      part.state === "streaming"
  );
}

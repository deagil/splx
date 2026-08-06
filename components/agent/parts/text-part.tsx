"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import { useMemo } from "react";
import { Streamdown } from "streamdown";
import {
  streamdownAnimation,
  streamdownPlugins,
} from "@/components/agent/lib/streamdown-config";
import { unwrapUnsafeMarkdownLinks } from "@/components/agent/lib/unwrap-unsafe-markdown-links";
import { Bubble, BubbleContent } from "@/components/agent/ui/bubble";
import { streamdownLinkSafety } from "@/components/agent/ui/streamdown-link-safety-modal";
import { cn } from "@/lib/utils";

/**
 * One text part of a message.
 *
 * Agent C rendered assistant text through its citation pipeline — hostname
 * matchers for its connectors plus custom `citation` / `cite-mark` Streamdown
 * tags. That is research-agent domain and did not come over, so assistant text
 * is plain markdown here.
 */
export function TextPart({
  part,
  role,
}: {
  part: Extract<EveMessagePart, { type: "text" }>;
  role: EveMessage["role"];
}) {
  const isAssistant = role !== "user";

  const markdown = useMemo(
    () => (isAssistant ? unwrapUnsafeMarkdownLinks(part.text) : part.text),
    [isAssistant, part.text]
  );

  if (!isAssistant) {
    return (
      <Bubble variant="imessage">
        <BubbleContent className="text-sm">
          <span className="whitespace-pre-wrap break-words">{part.text}</span>
        </BubbleContent>
      </Bubble>
    );
  }

  return (
    <Streamdown
      animated={streamdownAnimation}
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0")}
      isAnimating={part.state === "streaming"}
      linkSafety={streamdownLinkSafety}
      plugins={streamdownPlugins}
    >
      {markdown}
    </Streamdown>
  );
}

"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  getAssistantMarkdown,
  isAssistantMessageComplete,
} from "@/components/agent/lib/message-content";
import { Message, MessageContent } from "@/components/agent/ui/message";
import type { ActivityItem } from "./parts/activity-types";
import { AgentActivityGroup } from "./parts/agent-activity-group";
import { AuthorizationPart } from "./parts/authorization-part";
import { MessageFooter } from "./parts/message-footer";
import { TextPart } from "./parts/text-part";

type RenderSegment =
  | { kind: "part"; part: EveMessagePart; index: number }
  | { kind: "activity"; items: ActivityItem[]; startIndex: number };

function segmentParts(parts: readonly EveMessagePart[]): RenderSegment[] {
  const segments: RenderSegment[] = [];
  let activityBuffer: ActivityItem[] = [];
  let activityStart = 0;

  const flushActivity = () => {
    if (activityBuffer.length === 0) {
      return;
    }
    segments.push({
      items: activityBuffer,
      kind: "activity",
      startIndex: activityStart,
    });
    activityBuffer = [];
  };

  parts.forEach((part, index) => {
    if (part.type === "step-start") {
      return;
    }

    if (part.type === "reasoning" || part.type === "dynamic-tool") {
      if (activityBuffer.length === 0) {
        activityStart = index;
      }
      activityBuffer.push(
        part.type === "reasoning"
          ? { index, kind: "reasoning", part }
          : { index, kind: "tool", part }
      );
      return;
    }

    flushActivity();
    segments.push({ index, kind: "part", part });
  });

  flushActivity();
  return segments;
}

export function ChatMessage({
  message,
  onRespond,
}: {
  message: EveMessage;
  onRespond: (requestId: string, optionId: string) => void;
}) {
  const segments = segmentParts(message.parts);
  const showFooter =
    message.role === "assistant" && isAssistantMessageComplete(message);
  const markdown = useMemo(
    () => (showFooter ? getAssistantMarkdown(message) : ""),
    [message, showFooter]
  );

  return (
    <Message from={message.role}>
      <MessageContent>
        {segments.map((segment): ReactNode => {
          if (segment.kind === "activity") {
            return (
              <AgentActivityGroup
                items={segment.items}
                key={`activity-${segment.startIndex}`}
                onRespond={onRespond}
              />
            );
          }

          const { part, index } = segment;
          switch (part.type) {
            case "text":
              return <TextPart key={index} part={part} role={message.role} />;
            case "authorization":
              return <AuthorizationPart key={index} part={part} />;
            default:
              return null;
          }
        })}
        {showFooter ? <MessageFooter markdown={markdown} /> : null}
      </MessageContent>
    </Message>
  );
}

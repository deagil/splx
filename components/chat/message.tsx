"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo, useState } from "react";
import type { ReactNode } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useDataStream } from "../shared/data-stream-provider";
import { DocumentToolResult } from "../document/document";
import { DocumentPreview } from "../document/document-preview";
import { MessageContent } from "../elements/message";
import { Response } from "../elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../elements/tool";
import { SparklesIcon } from "../shared/icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "../input/preview-attachment";
import { Weather } from "../shared/weather";
import { Loader } from "../elements/loader";
import { Shimmer } from "../ai-elements/shimmer";
import { MentionChip } from "../input/mention-chip";
import type { MentionMetadata } from "@/lib/types/mentions";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "../ai-elements/chain-of-thought";
import { SearchIcon } from "lucide-react";

/**
 * Get icon based on mention type (matching MentionChip logic)
 */
function getMentionIcon(type: MentionMetadata["type"]): string {
  switch (type) {
    case "page":
      return "📄";
    case "block":
      return "🧩";
    case "table":
      return "📊";
    case "record":
      return "📝";
    case "user":
      return "👤";
    case "lookup":
      return "🔍";
    default:
      return "📎";
  }
}

/**
 * Render text with mentions as inline elements with icons
 */
function renderTextWithMentions(
  text: string,
  mentions?: MentionMetadata[]
): ReactNode {
  if (!mentions || mentions.length === 0) {
    return text;
  }

  // Create a map of mention labels to mention objects
  const mentionMap = new Map<string, MentionMetadata>();
  for (const mention of mentions) {
    mentionMap.set(mention.label, mention);
  }

  // Split text by mention patterns (@Label)
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    const beforeMatch = text.slice(lastIndex, match.index);
    if (beforeMatch) {
      parts.push(beforeMatch);
    }

    const mentionLabel = match[1];
    const mention = mentionMap.get(mentionLabel);
    
    if (mention) {
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="inline-flex items-center gap-1 align-baseline rounded bg-muted/50 px-1.5 py-0.5 text-sm font-medium text-foreground"
        >
          <span className="text-xs leading-none">{getMentionIcon(mention.type)}</span>
          <span>{match[0]}</span>
        </span>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = mentionPattern.lastIndex;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) {
    parts.push(remaining);
  }

  return parts.length > 0 ? parts : text;
}

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  // Collect all web search tool calls from the message parts
  // These are parts where the AI used the web_search tool to search the internet or fetch URLs
  const webSearchToolCalls = message.parts?.filter(
    (part) => (part as any).type === "tool-web_search"
  ) || [];

  // Show Chain of Thought component when:
  // 1. There are web search tool calls present (AI performed web searches)
  // 2. The message is from the assistant (not the user)
  // This groups all web search steps together in a collapsible, visual format
  const shouldShowChainOfThought = webSearchToolCalls.length > 0 && message.role === "assistant";

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role={message.role}
      data-testid={`message-${message.role}`}
      initial={{ opacity: 0 }}
    >
      <div
        className={cn("flex w-full items-start", {
          "justify-end gap-2 md:gap-3": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        <div
          className={cn("flex flex-col", {
            "gap-2 md:gap-4": message.parts?.some(
              (p) => p.type === "text" && p.text?.trim()
            ),
            "min-h-96": message.role === "assistant" && requiresScrollPadding && !isLoading,
            "w-full":
              (message.role === "assistant" &&
                message.parts?.some(
                  (p) => p.type === "text" && p.text?.trim()
                )) ||
              mode === "edit",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: attachment.filename ?? "file",
                    contentType: attachment.mediaType,
                    url: attachment.url,
                  }}
                  key={attachment.url}
                />
              ))}
            </div>
          )}

          {shouldShowChainOfThought && (
            <ChainOfThought defaultOpen={true} className="mb-4">
              <ChainOfThoughtHeader>
                Searching online
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {webSearchToolCalls.map((part, idx) => {
                  const partAny = part as any;
                  const output = partAny.output as any;
                  
                  // OpenAI's web search tool returns an 'action' object that describes what the AI did:
                  // - "search": Performed a general web search query (e.g., "What is React?")
                  // - "openPage": Opened/fetched a specific URL (e.g., when user provides a URL directly)
                  // - "find": Searched for specific text/pattern within an already-loaded page
                  const action = output?.action;
                  
                  // Sources are URLs or APIs that were used/cited in the search
                  // These appear as badges below each step
                  const sources = output?.sources || [];
                  
                  // Default label - used as fallback if action type is unknown or missing
                  let stepLabel = "Searching the web";
                  let stepDescription: string | undefined;
                  
                  // Determine the label and description based on the action type
                  if (action) {
                    if (action.type === "search") {
                      // Condition: AI performed a general web search query
                      // Shows when: User asks a question that requires web search (e.g., "What happened in SF last week?")
                      // Label: Displays the actual search query if available, otherwise generic "Performing web search"
                      stepLabel = action.query ? `Searching: "${action.query}"` : "Performing web search";
                    } else if (action.type === "openPage") {
                      // Condition: AI opened/fetched a specific URL
                      // Shows when: User provides a URL directly (e.g., "What's on this page: https://example.com")
                      //             OR AI found a URL from search results and is reading it
                      // Label: "Reading page" - more accurate than "Opening page" since it's fetching content
                      stepLabel = "Reading page";
                      // Description shows the URL being read
                      stepDescription = action.url;
                    } else if (action.type === "find") {
                      // Condition: AI searched for specific text/pattern within a loaded page
                      // Shows when: AI needs to find specific content within a page (e.g., searching for a heading or section)
                      // Label: "Finding content" - indicates searching within a page
                      stepLabel = "Finding content";
                      // Description shows what pattern is being searched for and in which URL
                      stepDescription = `Searching for "${action.pattern}" in ${action.url}`;
                    }
                  }

                  // Determine if this is the last step (for potential future use)
                  const isLast = idx === webSearchToolCalls.length - 1;
                  
                  // Determine the visual status of this step:
                  // - "complete": Tool call finished, output is available
                  // - "active": Tool call is in progress, input received but waiting for output
                  // - "pending": Tool call hasn't started yet
                  const status = partAny.state === "output-available" 
                    ? "complete" 
                    : partAny.state === "input-available" 
                    ? "active" 
                    : "pending";

                  return (
                    <ChainOfThoughtStep
                      key={partAny.toolCallId}
                      icon={SearchIcon}
                      label={stepLabel}
                      description={stepDescription || undefined}
                      status={status}
                    >
                      {/* 
                        Display sources as clickable badges below each step.
                        Sources appear when:
                        - The web search found relevant URLs
                        - The AI opened a page that has citations
                        - The search results include source references
                        Each source badge shows the hostname (e.g., "example.com") and links to the full URL
                      */}
                      {sources.length > 0 && (
                        <ChainOfThoughtSearchResults>
                          {sources.map((source: { type: string; url?: string; name?: string }, sourceIdx: number) => (
                            <ChainOfThoughtSearchResult key={sourceIdx} asChild>
                              <a
                                href={source.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {/* 
                                  Display format:
                                  - For URL sources: Show hostname (e.g., "example.com")
                                  - For API sources: Show the API name
                                  - Fallback: "Source" if neither is available
                                */}
                                {source.type === "url" && source.url
                                  ? new URL(source.url).hostname
                                  : source.name || "Source"}
                              </a>
                            </ChainOfThoughtSearchResult>
                          ))}
                        </ChainOfThoughtSearchResults>
                      )}
                    </ChainOfThoughtStep>
                  );
                })}
              </ChainOfThoughtContent>
            </ChainOfThought>
          )}

          {message.parts?.map((part, partIndex) => {
            const { type } = part;
            const key = `message-${message.id}-part-${partIndex}`;

            // Skip web search tool calls if we're showing them in Chain of Thought
            if ((type as string) === "tool-web_search" && shouldShowChainOfThought) {
              return null;
            }

            if (type === "reasoning") {
              // Check if this reasoning part is currently streaming
              // Reasoning is streaming if:
              // 1. The message is loading (status is streaming and this is the last message)
              // 2. This reasoning part is the last part, OR there's no text part after it yet
              // Show reasoning immediately when streaming starts, even before text parts arrive
              const isReasoningStreaming =
                isLoading &&
                (partIndex === message.parts.length - 1 ||
                  !message.parts
                    .slice(partIndex + 1)
                    .some((p) => p.type === "text"));

              // Show reasoning only if it has content
              // Don't show empty reasoning parts to prevent flicker and clutter
              const hasReasoningContent = part.text?.trim().length > 0;
              
              // Only show if there's actual content (not just when streaming)
              // This prevents empty reasoning steps from appearing
              if (!hasReasoningContent) {
                return null;
              }

              return (
                <MessageReasoning
                  isLoading={isReasoningStreaming}
                  key={key}
                  reasoning={part.text || ""}
                />
              );
            }

            if (type === "text") {
              if (mode === "view") {
                return (
                  <div key={key}>
                    <MessageContent
                      className={cn({
                        "w-fit break-words rounded-2xl px-3 py-2 text-right text-white":
                          message.role === "user",
                        "bg-transparent px-0 py-0 text-left":
                          message.role === "assistant",
                      })}
                      data-testid="message-content"
                      style={
                        message.role === "user"
                          ? { backgroundColor: "#006cff" }
                          : undefined
                      }
                    >
                      <Response>
                        {renderTextWithMentions(
                          sanitizeText(part.text),
                          (message as any).mentions
                        )}
                      </Response>
                    </MessageContent>
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type === "tool-getWeather") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-getWeather" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={<Weather weatherAtLocation={part.output} />}
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-createDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error creating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <DocumentPreview
                  isReadonly={isReadonly}
                  key={toolCallId}
                  result={part.output}
                />
              );
            }

            if (type === "tool-updateDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error updating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <div className="relative" key={toolCallId}>
                  <DocumentPreview
                    args={{ ...part.output, isUpdate: true }}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                </div>
              );
            }

            if (type === "tool-requestSuggestions") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-requestSuggestions" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          "error" in part.output ? (
                            <div className="rounded border p-2 text-red-500">
                              Error: {String(part.output.error)}
                            </div>
                          ) : (
                            <DocumentToolResult
                              isReadonly={isReadonly}
                              result={part.output}
                              type="request-suggestions"
                            />
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if ((type as string) === "tool-web_search") {
              const partAny = part as any;
              const { toolCallId, state } = partAny;

              return (
                <Tool defaultOpen={false} key={toolCallId}>
                  <ToolHeader state={state} type="tool-web_search" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={partAny.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          partAny.output && "error" in partAny.output ? (
                            <div className="rounded border p-2 text-red-500">
                              Error: {String(partAny.output.error)}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {partAny.output && typeof partAny.output === "object" && "action" in partAny.output && (
                                <div className="space-y-1">
                                  <h5 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                    Action
                                  </h5>
                                  <div className="rounded-md bg-muted/50 p-2 text-xs">
                                    {partAny.output.action.type === "search" && (
                                      <div>
                                        <span className="font-medium">Search:</span>{" "}
                                        {partAny.output.action.query || "No query"}
                                      </div>
                                    )}
                                    {partAny.output.action.type === "openPage" && (
                                      <div>
                                        <span className="font-medium">Opened:</span>{" "}
                                        <a
                                          className="text-primary hover:underline"
                                          href={partAny.output.action.url}
                                          rel="noreferrer"
                                          target="_blank"
                                        >
                                          {partAny.output.action.url}
                                        </a>
                                      </div>
                                    )}
                                    {partAny.output.action.type === "find" && (
                                      <div className="space-y-1">
                                        <div>
                                          <span className="font-medium">Finding in:</span>{" "}
                                          <a
                                            className="text-primary hover:underline"
                                            href={partAny.output.action.url}
                                            rel="noreferrer"
                                            target="_blank"
                                          >
                                            {partAny.output.action.url}
                                          </a>
                                        </div>
                                        <div>
                                          <span className="font-medium">Pattern:</span>{" "}
                                          {partAny.output.action.pattern}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {partAny.output && typeof partAny.output === "object" && "sources" in partAny.output && Array.isArray(partAny.output.sources) && partAny.output.sources.length > 0 && (
                                <div className="space-y-1">
                                  <h5 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                    Sources
                                  </h5>
                                  <div className="flex flex-col gap-1">
                                    {partAny.output.sources.map((source: { type: string; url?: string; name?: string }, idx: number) => (
                                      <a
                                        key={idx}
                                        className="text-primary hover:underline text-xs"
                                        href={source.url}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        {source.type === "url" && source.url ? (
                                          <>
                                            <span className="font-medium">{new URL(source.url).hostname}</span>
                                            <span className="text-muted-foreground ml-1">({source.url})</span>
                                          </>
                                        ) : (
                                          <span>{source.name || "Unknown source"}</span>
                                        )}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}

          {!isReadonly && (
            <MessageActions
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              setMode={setMode}
              vote={vote}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.message.id !== nextProps.message.id) {
      return false;
    }
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
      return false;
    }
    if (!equal(prevProps.message.parts, nextProps.message.parts)) {
      return false;
    }
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }

    return false;
  }
);

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role={role}
      data-testid="message-assistant-loading"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      initial={{ opacity: 0 }}
      layout
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start justify-start gap-3">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader size={14} />
            <div className="flex flex-col gap-1">
              <Shimmer duration={1.5}>Preparing response...</Shimmer>
              <div className="text-muted-foreground/70 text-xs">
                Loading context and initializing AI model
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


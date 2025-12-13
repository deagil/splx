"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion, AnimatePresence } from "framer-motion";
import { memo, useState, useEffect } from "react";
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
import type { MentionMetadata } from "@/lib/types/mentions";
import { MessageContext } from "./message-context";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "../ai-elements/chain-of-thought";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DatabaseIcon,
  FileTextIcon,
  NavigationIcon,
  SearchIcon,
} from "lucide-react";

// ============================================================================
// Typing Indicator - Shows when waiting for first token in stream
// ============================================================================

const TypingDot = memo(({ delay }: { delay: number }) => (
  <motion.span
    className="inline-block size-1.5 rounded-full bg-current"
    initial={{ opacity: 0.4, y: 0 }}
    animate={{ 
      opacity: [0.4, 1, 0.4],
      y: [0, -3, 0]
    }}
    transition={{
      duration: 0.6,
      repeat: Number.POSITIVE_INFINITY,
      delay,
      ease: "easeInOut",
    }}
  />
));

TypingDot.displayName = "TypingDot";

/**
 * Typing indicator shown when assistant is about to respond
 * but hasn't sent any text yet (stream started, waiting for first token)
 */
export const TypingIndicator = memo(() => (
  <motion.div
    className="flex items-center gap-1 text-muted-foreground py-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    data-testid="typing-indicator"
  >
    <TypingDot delay={0} />
    <TypingDot delay={0.15} />
    <TypingDot delay={0.3} />
  </motion.div>
));

TypingIndicator.displayName = "TypingIndicator";

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

  // Extract custom context from the message (mentions and skill)
  // These are custom fields added when the message was sent
  const messageAny = message as any;
  const messageMentions: MentionMetadata[] | undefined = messageAny.mentions;
  const messageSkill: { id: string; name: string; command: string; prompt?: string } | undefined = messageAny.skill;
  
  // Check if message has any context attached
  const hasContext = (messageMentions && messageMentions.length > 0) || messageSkill;

  useDataStream();

  // Collect all web search tool calls from the message parts
  // These are parts where the AI used the web_search tool to search the internet or fetch URLs
  const webSearchToolCalls = message.parts?.filter(
    (part) => (part as any).type === "tool-web_search"
  ) || [];

  // Collect all data tool calls (queryUserTable, searchPages, navigateToPage)
  // These are the custom tools for querying data and navigating pages
  const dataToolCalls = message.parts?.filter((part) => {
    const partType = (part as any).type;
    return (
      partType === "tool-queryUserTable" ||
      partType === "tool-searchPages" ||
      partType === "tool-navigateToPage"
    );
  }) || [];

  // Show Chain of Thought component when:
  // 1. There are web search tool calls present (AI performed web searches)
  // 2. The message is from the assistant (not the user)
  // This groups all web search steps together in a collapsible, visual format
  const shouldShowChainOfThought = webSearchToolCalls.length > 0 && message.role === "assistant";

  // Show Data Tools Chain of Thought when data tools are used
  const shouldShowDataToolsChainOfThought = dataToolCalls.length > 0 && message.role === "assistant";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="group/message w-full"
      data-role={message.role}
      data-testid={`message-${message.role}`}
      exit={{ 
        opacity: 0, 
        transition: { duration: 0.1 } 
      }}
      initial={{ 
        opacity: 0, 
        y: message.role === "user" ? 8 : 0
      }}
      transition={{ 
        duration: 0.15, 
        ease: "easeOut"
      }}
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

          {/* Context attached to user message (skill, mentions) */}
          {message.role === "user" && hasContext && (
            <div className="flex justify-end">
              <MessageContext
                skill={messageSkill}
                mentions={messageMentions}
              />
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

          {/* Data Tools Chain of Thought - shows queryUserTable, searchPages, navigateToPage steps */}
          {shouldShowDataToolsChainOfThought && (
            <ChainOfThought defaultOpen={true} className="mb-4">
              <ChainOfThoughtHeader>
                Processing data request
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {dataToolCalls.map((part, idx) => {
                  const partAny = part as any;
                  const partType = partAny.type as string;
                  const input = partAny.input as Record<string, unknown> | undefined;
                  const output = partAny.output as Record<string, unknown> | undefined;
                  const isError = partAny.state === "output-error";

                  // Determine icon, label, and description based on tool type
                  let Icon = DatabaseIcon;
                  let stepLabel = "Processing...";
                  let stepDescription: string | undefined;
                  let resultSummary: string | undefined;

                  if (partType === "tool-queryUserTable") {
                    Icon = DatabaseIcon;
                    const tableName = input?.tableName as string | undefined;
                    const filters = input?.filters as Array<{ column: string; value: string }> | undefined;

                    if (isError) {
                      stepLabel = `Query failed: ${tableName || "table"}`;
                      stepDescription = output?.message as string || "An error occurred while querying the table.";
                    } else if (partAny.state === "output-available" && output) {
                      const rowCount = (output.rows as unknown[])?.length ?? 0;
                      const totalRows = (output.pagination as { totalRows?: number })?.totalRows ?? rowCount;
                      stepLabel = `Queried ${tableName}`;
                      stepDescription = `Found ${totalRows} record${totalRows === 1 ? "" : "s"}`;
                      if (filters && filters.length > 0) {
                        stepDescription += ` with ${filters.length} filter${filters.length === 1 ? "" : "s"}`;
                      }
                    } else {
                      stepLabel = tableName ? `Querying ${tableName}...` : "Querying table...";
                      if (filters && filters.length > 0) {
                        stepDescription = `Applying ${filters.length} filter${filters.length === 1 ? "" : "s"}`;
                      }
                    }
                  } else if (partType === "tool-searchPages") {
                    Icon = FileTextIcon;
                    const query = input?.query as string | undefined;

                    if (isError) {
                      stepLabel = "Page search failed";
                      stepDescription = output?.message as string || "An error occurred while searching pages.";
                    } else if (partAny.state === "output-available" && output) {
                      const pageCount = (output.pages as unknown[])?.length ?? 0;
                      stepLabel = query ? `Searched for "${query}"` : "Listed pages";
                      stepDescription = `Found ${pageCount} page${pageCount === 1 ? "" : "s"}`;
                    } else {
                      stepLabel = query ? `Searching for "${query}"...` : "Searching pages...";
                    }
                  } else if (partType === "tool-navigateToPage") {
                    Icon = NavigationIcon;
                    const pageName = input?.pageName as string | undefined;
                    const pageId = input?.pageId as string | undefined;

                    if (isError) {
                      stepLabel = "Navigation failed";
                      stepDescription = output?.message as string || "Could not navigate to the page.";
                    } else if (partAny.state === "output-available" && output) {
                      const found = output.found as boolean;
                      const outputPageName = output.pageName as string | undefined;
                      const navigated = output.navigated as boolean;

                      if (found && navigated) {
                        stepLabel = `Navigated to ${outputPageName || "page"}`;
                        stepDescription = output.url as string | undefined;
                      } else if (found && !navigated) {
                        stepLabel = `Found ${outputPageName || "page"}`;
                        stepDescription = output.warning as string || "Page found but navigation pending.";
                      } else {
                        stepLabel = "Page not found";
                        stepDescription = output.message as string;
                      }
                    } else {
                      stepLabel = pageName
                        ? `Navigating to "${pageName}"...`
                        : pageId
                        ? `Loading page ${pageId}...`
                        : "Navigating...";
                    }
                  }

                  // Determine the visual status of this step
                  let status: "complete" | "active" | "pending" = "pending";
                  if (partAny.state === "output-available") {
                    status = "complete";
                  } else if (partAny.state === "output-error") {
                    status = "complete"; // Show as complete but with error styling
                  } else if (partAny.state === "input-available") {
                    status = "active";
                  }

                  return (
                    <ChainOfThoughtStep
                      key={partAny.toolCallId}
                      icon={isError ? AlertCircleIcon : Icon}
                      label={stepLabel}
                      description={stepDescription}
                      status={status}
                      className={isError ? "text-destructive" : undefined}
                    >
                      {/* Show result details for successful queries */}
                      {partType === "tool-queryUserTable" &&
                        !isError &&
                        partAny.state === "output-available" &&
                        output && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {((output.rows as unknown[])?.length ?? 0) > 0 && (
                              <span>
                                Columns: {((output.columns as string[]) || []).slice(0, 5).join(", ")}
                                {((output.columns as string[])?.length ?? 0) > 5 && "..."}
                              </span>
                            )}
                          </div>
                        )}

                      {/* Show page suggestions if search found pages */}
                      {partType === "tool-searchPages" &&
                        !isError &&
                        partAny.state === "output-available" &&
                        output && (
                          <ChainOfThoughtSearchResults className="mt-2">
                            {((output.pages as Array<{ name: string; id: string }>) || [])
                              .slice(0, 3)
                              .map((page) => (
                                <ChainOfThoughtSearchResult key={page.id}>
                                  {page.name}
                                </ChainOfThoughtSearchResult>
                              ))}
                            {((output.pages as unknown[])?.length ?? 0) > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{((output.pages as unknown[])?.length ?? 0) - 3} more
                              </span>
                            )}
                          </ChainOfThoughtSearchResults>
                        )}
                    </ChainOfThoughtStep>
                  );
                })}
              </ChainOfThoughtContent>
            </ChainOfThought>
          )}

          {/* Unified reasoning section - combines all reasoning parts into one */}
          {(() => {
            // Collect all reasoning parts and combine their text
            const reasoningParts = message.parts?.filter(p => p.type === "reasoning") || [];
            const combinedReasoning = reasoningParts
              .map(p => (p as any).text || "")
              .filter(Boolean)
              .join("\n\n");
            
            if (!combinedReasoning.trim()) return null;
            
            // Check if reasoning is still streaming (no text parts yet or still loading)
            const hasTextPart = message.parts?.some(p => p.type === "text" && (p as any).text?.trim());
            const isReasoningStreaming = isLoading && !hasTextPart;
            
            return (
              <MessageReasoning
                hasTextStarted={hasTextPart || false}
                isLoading={isReasoningStreaming}
                key={`reasoning-${message.id}`}
                reasoning={combinedReasoning}
              />
            );
          })()}

          {/* Typing indicator - shows when streaming but no text content yet */}
          {(() => {
            // Check if we should show typing indicator:
            // 1. Message is loading (streaming in progress)
            // 2. It's an assistant message
            // 3. No text content has arrived yet
            const hasTextContent = message.parts?.some(
              (p) => p.type === "text" && (p as { text?: string }).text?.trim()
            );
            const hasReasoningContent = message.parts?.some(
              (p) => p.type === "reasoning" && (p as { text?: string }).text?.trim()
            );
            const showTypingIndicator = 
              isLoading && 
              message.role === "assistant" && 
              !hasTextContent &&
              !hasReasoningContent;

            if (showTypingIndicator) {
              return (
                <AnimatePresence>
                  <TypingIndicator key="typing" />
                </AnimatePresence>
              );
            }
            return null;
          })()}

          {message.parts?.map((part, partIndex) => {
            const { type } = part;
            const key = `message-${message.id}-part-${partIndex}`;

            // Skip reasoning parts - they're handled above as a unified section
            if (type === "reasoning") {
              return null;
            }

            // Skip web search tool calls if we're showing them in Chain of Thought
            if ((type as string) === "tool-web_search" && shouldShowChainOfThought) {
              return null;
            }

            // Skip data tool calls if we're showing them in Chain of Thought
            if (
              ((type as string) === "tool-queryUserTable" ||
                (type as string) === "tool-searchPages" ||
                (type as string) === "tool-navigateToPage") &&
              shouldShowDataToolsChainOfThought
            ) {
              return null;
            }

            if (type === "text") {
              if (mode === "view") {
                // Check if this text part is actively streaming
                // (it's the last text part and the message is still loading)
                const isTextStreaming = 
                  isLoading && 
                  message.role === "assistant" &&
                  partIndex === message.parts.length - 1;

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
                      <Response isStreaming={isTextStreaming}>
                        {sanitizeText(part.text)}
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

// ============================================================================
// Unified Message Initialization Component
// Shows contextual processing state with smooth transitions
// Makes the UI feel snappy by showing appropriate feedback
// ============================================================================

type ThinkingPhase = 
  | "reading-article"
  | "gathering-context"
  | "processing"
  | "thinking";

type ThinkingMessageProps = {
  /** Whether message has mentions that need enrichment */
  hasMentions?: boolean;
  /** Whether message has URL mentions specifically */
  hasUrlMentions?: boolean;
  /** Whether message has attachments */
  hasAttachments?: boolean;
  /** Number of attachments */
  attachmentCount?: number;
  /** Number of URL mentions */
  urlCount?: number;
};

/** Get contextual label for current processing phase */
function getPhaseLabel(phase: ThinkingPhase, props: ThinkingMessageProps): string {
  switch (phase) {
    case "reading-article":
      return props.urlCount && props.urlCount > 1 
        ? `Reading ${props.urlCount} articles...`
        : "Reading article...";
    case "gathering-context":
      if (props.hasAttachments) {
        return props.attachmentCount && props.attachmentCount > 1
          ? `Processing ${props.attachmentCount} files...`
          : "Processing file...";
      }
      return "Gathering context...";
    case "processing":
      return "Processing...";
    case "thinking":
      return "Thinking...";
    default:
      return "Thinking...";
  }
}

/** Animated step indicator with spinner or checkmark */
const StepIndicator = memo(({ 
  label, 
  isComplete,
  isActive 
}: { 
  label: string; 
  isComplete: boolean;
  isActive: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
    transition={{ duration: 0.15, ease: "easeOut" }}
    className={cn(
      "flex items-center gap-2 text-sm",
      isComplete ? "text-muted-foreground" : "text-foreground"
    )}
  >
    {isActive && !isComplete && (
      <Loader size={14} className="text-primary" />
    )}
    {isComplete && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        <svg
          className="size-3.5 text-emerald-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>
    )}
    <span className={cn(
      "transition-colors duration-150",
      isActive && !isComplete && "font-medium"
    )}>
      {label}
    </span>
  </motion.div>
));

StepIndicator.displayName = "StepIndicator";

export const ThinkingMessage = memo(({
  hasMentions = false,
  hasUrlMentions = false,
  hasAttachments = false,
  attachmentCount = 0,
  urlCount = 0,
}: ThinkingMessageProps) => {
  const role = "assistant";
  const [completedPhases, setCompletedPhases] = useState<ThinkingPhase[]>([]);
  const [currentPhase, setCurrentPhase] = useState<ThinkingPhase | null>(null);

  // Determine phases based on message context
  useEffect(() => {
    const phases: ThinkingPhase[] = [];
    
    // Build phase sequence based on what's in the message
    if (hasUrlMentions) {
      phases.push("reading-article");
    }
    if (hasMentions && !hasUrlMentions) {
      phases.push("gathering-context");
    }
    if (hasAttachments) {
      phases.push("gathering-context");
    }
    // Always end with thinking
    phases.push("thinking");

    // Start with first phase
    if (phases.length > 0) {
      setCurrentPhase(phases[0]);
    }

    // Progress through phases with realistic timing
    let phaseIndex = 0;
    const progressPhase = () => {
      if (phaseIndex < phases.length - 1) {
        // Mark current as complete, move to next
        setCompletedPhases(prev => [...prev, phases[phaseIndex]]);
        phaseIndex++;
        setCurrentPhase(phases[phaseIndex]);
      }
    };

    // Timing based on phase type (feels natural)
    const timers: NodeJS.Timeout[] = [];
    let elapsed = 0;
    
    for (let i = 0; i < phases.length - 1; i++) {
      const phase = phases[i];
      // URL reading feels longer (even though it's pre-fetched, user expects it)
      const duration = phase === "reading-article" ? 800 : 
                       phase === "gathering-context" ? 500 : 300;
      elapsed += duration;
      timers.push(setTimeout(progressPhase, elapsed));
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [hasMentions, hasUrlMentions, hasAttachments]);

  const props = { hasMentions, hasUrlMentions, hasAttachments, attachmentCount, urlCount };

  return (
    <motion.div
      className="group/message w-full"
      data-role={role}
      data-testid="message-assistant-loading"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start justify-start gap-3">
        <motion.div
          className="-mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <SparklesIcon size={14} />
        </motion.div>

        <div className="flex flex-col gap-1.5 pt-1">
          <AnimatePresence mode="popLayout">
            {/* Show completed phases */}
            {completedPhases.map((phase) => (
              <StepIndicator
                key={phase}
                label={getPhaseLabel(phase, props)}
                isComplete={true}
                isActive={false}
              />
            ))}
            
            {/* Show current active phase */}
            {currentPhase && (
              <motion.div
                key={currentPhase}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <Loader size={14} className="text-primary" />
                {currentPhase === "thinking" ? (
                  <Shimmer duration={1.5}>{getPhaseLabel(currentPhase, props)}</Shimmer>
                ) : (
                  <span className="font-medium">{getPhaseLabel(currentPhase, props)}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

ThinkingMessage.displayName = "ThinkingMessage";


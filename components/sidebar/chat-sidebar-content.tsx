"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "../artifact/artifact";
import { useDataStream } from "../shared/data-stream-provider";
import { Messages } from "../chat/messages";
import { MultimodalInput } from "../input/multimodal-input";
import { getChatHistoryPaginationKey } from "../sidebar/sidebar-history";
import { toast } from "../shared/toast";
import type { VisibilityType } from "../shared/visibility-selector";
import { ChatStatusBar } from "./chat-status-bar";
import { chatModels } from "@/lib/ai/models";

export function ChatSidebarContent({
  chatId,
  initialChatModel,
  initialMessages,
  initialVisibilityType,
  isReadonly,
  autoResume,
  onMessagesChange,
  onArtifactPropsReady,
}: {
  chatId: string;
  initialChatModel: string;
  initialMessages: ChatMessage[];
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  onMessagesChange?: (messages: ChatMessage[]) => void;
  onArtifactPropsReady?: (props: {
    attachments: Attachment[];
    chatId: string;
    input: string;
    isReadonly: boolean;
    messages: ChatMessage[];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
    selectedModelId: string;
    selectedVisibilityType: VisibilityType;
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
    setAttachments: Dispatch<SetStateAction<Attachment[]>>;
    setInput: Dispatch<SetStateAction<string>>;
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    status: UseChatHelpers<ChatMessage>["status"];
    stop: UseChatHelpers<ChatMessage>["stop"];
    votes: Vote[] | undefined;
  }) => void;
}) {
  const { visibilityType } = useChatVisibility({
    chatId,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(undefined);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);

  // Get personalization status from localStorage
  const [personalizationEnabled, setPersonalizationEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("personalization-enabled") === "true";
    }
    return false;
  });

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  // Keyboard shortcut to cycle through models (Ctrl + M)
  useEffect(() => {
    console.log("[ChatSidebar] Keyboard shortcut listener mounted");

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log("[ChatSidebar] Key pressed:", event.key, "ctrlKey:", event.ctrlKey, "metaKey:", event.metaKey);

      // Ctrl + M to cycle through models (Control key on both Mac and Windows)
      if (event.key === "m" && event.ctrlKey && !event.metaKey && !event.shiftKey) {
        console.log("[ChatSidebar] Ctrl+M detected! Cycling models...");
        event.preventDefault();

        // Find current model index and cycle to next
        const currentIndex = chatModels.findIndex((m) => m.id === currentModelId);
        const nextIndex = (currentIndex + 1) % chatModels.length;
        const nextModel = chatModels[nextIndex];

        console.log("[ChatSidebar] Current model:", currentModelId, "Next model:", nextModel?.id);

        if (nextModel) {
          setCurrentModelId(nextModel.id);
          // Save to cookie for persistence
          document.cookie = `chat-model=${nextModel.id}; path=/; max-age=${60 * 60 * 24 * 365}`;

          // Show toast notification
          toast({
            type: "success",
            description: `Switched to ${nextModel.name}`,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      console.log("[ChatSidebar] Keyboard shortcut listener unmounted");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentModelId]);

  // Listen for changes to personalization in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const enabled = localStorage.getItem("personalization-enabled") === "true";
      setPersonalizationEnabled(enabled);
    };

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom events from same-window updates
    window.addEventListener("personalization-changed", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("personalization-changed", handleStorageChange);
    };
  }, []);

  // Load messages when chatId changes (for existing chats from URL)
  // Fetch messages if autoResume is true (meaning chatId came from URL)
  const { data: fetchedMessages, isLoading: isLoadingMessages } = useSWR<ChatMessage[]>(
    autoResume ? `/api/chat/${chatId}/messages` : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }
      const data = await response.json() as { messages?: ChatMessage[] };
      return data.messages || [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  // Determine if we're in a loading state for an existing chat
  const isLoadingExistingChat = autoResume && isLoadingMessages && !fetchedMessages;

  // Use fetched messages if available, otherwise use initialMessages
  const messagesToUse = autoResume && fetchedMessages ? fetchedMessages : initialMessages;

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: messagesToUse,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            personalizationEnabled,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
        } else {
          toast({
            type: "error",
            description: error.message,
          });
        }
      }
    },
  });

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/";
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      // Only navigate if not on dashboard route
      if (!isDashboardRoute) {
        window.history.replaceState({}, "", `/chat/${chatId}`);
      }
    }
  }, [query, sendMessage, hasAppendedQuery, chatId, isDashboardRoute]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${chatId}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Update messages when fetched messages load (for existing chats)
  useEffect(() => {
    if (autoResume && fetchedMessages && fetchedMessages.length > 0) {
      // Only update if current messages are empty or different
      // This handles the case where messages load after useChat initializes
      if (messages.length === 0 || messages.length !== fetchedMessages.length) {
        setMessages(fetchedMessages);
      }
    }
  }, [fetchedMessages, autoResume, setMessages, messages.length]);

  useAutoResume({
    autoResume,
    initialMessages: messagesToUse,
    resumeStream,
    setMessages,
  });

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    if (onArtifactPropsReady && isArtifactVisible) {
      onArtifactPropsReady({
        attachments,
        chatId,
        input,
        isReadonly,
        messages,
        regenerate,
        selectedModelId: currentModelId,
        selectedVisibilityType: visibilityType,
        sendMessage,
        setAttachments,
        setInput,
        setMessages,
        status,
        stop,
        votes,
      });
    }
  }, [
    attachments,
    chatId,
    input,
    isArtifactVisible,
    isReadonly,
    messages,
    onArtifactPropsReady,
    regenerate,
    currentModelId,
    visibilityType,
    sendMessage,
    setAttachments,
    setInput,
    setMessages,
    status,
    stop,
    votes,
  ]);

  return (
    <>
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-transparent">
        <AnimatePresence mode="wait">
          {isLoadingExistingChat ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full flex-1 flex-col overflow-hidden"
            >
              {/* Loading skeleton */}
              <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
                {/* Simulated message skeleton */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 justify-end">
                    <div className="flex flex-1 flex-col items-end gap-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Loading state input area placeholder */}
              <div className="pointer-events-none sticky bottom-0 z-10 flex flex-col">
                <div className="h-12 bg-linear-to-t from-sidebar to-transparent" />
                <div className="bg-sidebar pb-1">
                  <div className="mx-2 h-[120px] animate-pulse rounded-xl border border-border bg-muted/50" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-full flex-1 flex-col overflow-hidden"
            >
              <Messages
                chatId={chatId}
                isArtifactVisible={isArtifactVisible}
                isReadonly={isReadonly}
                messages={messages}
                regenerate={regenerate}
                selectedModelId={initialChatModel}
                setMessages={setMessages}
                status={status}
                votes={votes}
                inputSlot={
                  !isReadonly && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
                      {/* Gradient fade overlay */}
                      <div className="h-10 bg-gradient-to-t from-sidebar to-transparent" />
                      {/* Input container */}
                      <div className="pointer-events-auto bg-sidebar pb-1">
                        <div className="flex w-full gap-2 pb-1.5">
                          <MultimodalInput
                            attachments={attachments}
                            chatId={chatId}
                            input={input}
                            messages={messages}
                            selectedModelId={currentModelId}
                            selectedVisibilityType={visibilityType}
                            sendMessage={sendMessage}
                            setAttachments={setAttachments}
                            setInput={setInput}
                            setMessages={setMessages}
                            status={status}
                            stop={stop}
                          />
                        </div>
                        <ChatStatusBar
                          onModelChange={setCurrentModelId}
                          selectedModelId={currentModelId}
                          usage={usage}
                        />
                      </div>
                    </div>
                  )
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


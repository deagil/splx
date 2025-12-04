"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";

// Helper for timestamped client-side logging
function logUI(label: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[Chat UI] ${timestamp} | ${label}`, data);
  } else {
    console.log(`[Chat UI] ${timestamp} | ${label}`);
  }
}
import { ChatHeader } from "@/components/chat/chat-header";
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
import { Messages } from "./messages";
import { MultimodalInput } from "../input/multimodal-input";
import { getChatHistoryPaginationKey } from "../sidebar/sidebar-history";
import { toast } from "../shared/toast";
import type { VisibilityType } from "../shared/visibility-selector";
import { ChatStatusBar } from "../sidebar/chat-status-bar";
import { chatModels } from "@/lib/ai/models";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  // Keyboard shortcut to cycle through models (Ctrl + M)
  useEffect(() => {
    console.log("[Chat] Keyboard shortcut listener mounted");

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log("[Chat] Key pressed:", event.key, "ctrlKey:", event.ctrlKey, "metaKey:", event.metaKey);

      // Ctrl + M to cycle through models (Control key on both Mac and Windows)
      if (event.key === "m" && event.ctrlKey && !event.metaKey && !event.shiftKey) {
        console.log("[Chat] Ctrl+M detected! Cycling models...");
        event.preventDefault();

        // Find current model index and cycle to next
        const currentIndex = chatModels.findIndex((m) => m.id === currentModelId);
        const nextIndex = (currentIndex + 1) % chatModels.length;
        const nextModel = chatModels[nextIndex];

        console.log("[Chat] Current model:", currentModelId, "Next model:", nextModel?.id);

        if (nextModel) {
          setCurrentModelId(nextModel.id);
          // Save to cookie for persistence
          document.cookie = `chat-model=${nextModel.id}; path=/; max-age=${60 * 60 * 24 * 365}`;

          // Show toast notification
          // toast({
          //   type: "success",
          //   description: `Switched to ${nextModel.name}`,
          // });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      console.log("[Chat] Keyboard shortcut listener unmounted");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentModelId]);

  // Track status changes for logging
  const prevStatusRef = useRef<string | null>(null);
  const messageSubmitTimeRef = useRef<number | null>(null);
  const firstChunkTimeRef = useRef<number | null>(null);
  const streamStartTimeRef = useRef<number | null>(null);

  const {
    messages,
    setMessages,
    sendMessage: originalSendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        logUI("📤 Sending request to API", { 
          chatId: request.id,
          model: currentModelIdRef.current,
        });
        return {
          body: {
            id: request.id,
            message: {
              ...lastMessage,
              // Explicitly preserve mentions field if present
              mentions: (lastMessage as any)?.mentions,
            },
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      // Log first chunk received
      if (!firstChunkTimeRef.current && streamStartTimeRef.current) {
        firstChunkTimeRef.current = Date.now();
        logUI("📨 First chunk received (TTFB)", { 
          timeToFirstByte: `${firstChunkTimeRef.current - streamStartTimeRef.current}ms`,
          type: dataPart.type,
        });
      }
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
        logUI("📊 Usage data received", { 
          totalTokens: (dataPart.data as AppUsage).totalTokens,
        });
      }
    },
    onFinish: () => {
      const totalTime = messageSubmitTimeRef.current 
        ? Date.now() - messageSubmitTimeRef.current 
        : undefined;
      logUI("✅ Stream finished", { 
        totalRoundTrip: totalTime ? `${totalTime}ms` : undefined,
      });
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      // Reset timing refs
      firstChunkTimeRef.current = null;
      streamStartTimeRef.current = null;
    },
    onError: (error) => {
      logUI("❌ Stream error", { error: error.message });
      if (error instanceof ChatSDKError) {
        // Check if it's a credit card error
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

  // Wrapped sendMessage to track timing
  const sendMessage = useCallback((...args: Parameters<typeof originalSendMessage>) => {
    messageSubmitTimeRef.current = Date.now();
    streamStartTimeRef.current = Date.now();
    firstChunkTimeRef.current = null;
    logUI("📝 User submitting message");
    return originalSendMessage(...args);
  }, [originalSendMessage]);

  // Log status transitions
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      const duration = messageSubmitTimeRef.current 
        ? Date.now() - messageSubmitTimeRef.current 
        : undefined;
      logUI(`🔄 Status changed: ${prevStatusRef.current || 'initial'} → ${status}`, {
        timeSinceSubmit: duration ? `${duration}ms` : undefined,
      });
      prevStatusRef.current = status;
    }
  }, [status]);

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `?chatId=${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
        />

        <Messages
          chatId={id}
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
              <div className="pointer-events-none sticky bottom-0 z-10 mx-auto flex w-full max-w-4xl flex-col">
                {/* Gradient fade overlay */}
                <div className="h-12 bg-linear-to-t from-background to-transparent" />
                {/* Input container */}
                <div className="pointer-events-auto bg-background pb-2">
                  <MultimodalInput
                    attachments={attachments}
                    chatId={id}
                    input={input}
                    messages={messages}
                    onModelChange={setCurrentModelId}
                    selectedModelId={currentModelId}
                    selectedVisibilityType={visibilityType}
                    sendMessage={sendMessage}
                    setAttachments={setAttachments}
                    setInput={setInput}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                    usage={usage}
                  />
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
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

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

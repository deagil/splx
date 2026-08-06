"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatAddToolApproveResponseFunction } from "ai";
import { FileXCorner, Maximize2, Minimize2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { AgentSidebarContent } from "@/components/agent/agent-sidebar-content";
import {
  MOCK_MODE_AVAILABLE,
  useAgentMockMode,
} from "@/components/agent/dev/mock-mode";
import { Artifact } from "@/components/artifact/artifact";
import { DataStreamHandler } from "@/components/shared/data-stream-handler";
import { ClockRewind, CrossIcon, PlusIcon } from "@/components/shared/icons";
import type { VisibilityType } from "@/components/shared/visibility-selector";
import { ChatSidebarContent } from "@/components/sidebar/chat-sidebar-content";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  initialArtifactData,
  useArtifact,
  useArtifactSelector,
} from "@/hooks/use-artifact";
import type { Vote } from "@/lib/db/schema";
import type { Attachment, ChatMessage, User } from "@/lib/types";
import { cn, generateUUID } from "@/lib/utils";
import { ChatSidebarResizeHandle } from "./chat-sidebar-resize-handle";
import { SidebarAgentHistory } from "./sidebar-agent-history";
import type { ChatHistory } from "./sidebar-history";
import { SidebarHistory } from "./sidebar-history";
import { useChatSidebarSide } from "./use-chat-sidebar-side";

const USE_EVE_AGENT = process.env.NEXT_PUBLIC_AGENT_RUNTIME === "eve";

export function ChatSidebar({
  chatId: initialChatId,
  initialChatModel,
  initialMessages,
  initialVisibilityType,
  isReadonly,
  user,
  onMessagesChange,
  initialHistory,
}: {
  chatId: string;
  initialChatModel: string;
  initialMessages: ChatMessage[];
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  user: User;
  onMessagesChange?: (messages: ChatMessage[]) => void;
  initialHistory?: ChatHistory | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleSidebar, open } = useSidebar();
  const { side: chatSidebarSide } = useChatSidebarSide();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setArtifact } = useArtifact();
  const [isExpandedMode, setIsExpandedMode] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);

  // Fade-in matches ChatSidebarTrigger; block clicks until it finishes.
  useEffect(() => {
    if (!open) {
      setControlsReady(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setControlsReady(true);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open]);

  // Load expanded mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-expanded-mode");
    if (stored === "true") {
      setIsExpandedMode(true);
      // Dispatch event to sync with SidebarWidthManager
      window.dispatchEvent(
        new CustomEvent("sidebar-expanded-toggle", { detail: true })
      );
    }
  }, []);

  const handleExpandedToggle = () => {
    const newMode = !isExpandedMode;
    setIsExpandedMode(newMode);
    localStorage.setItem("sidebar-expanded-mode", newMode ? "true" : "false");

    // Dispatch custom event to notify SidebarWidthManager
    window.dispatchEvent(
      new CustomEvent("sidebar-expanded-toggle", { detail: newMode })
    );
  };

  const handleCloseClick = () => {
    if (isArtifactVisible) {
      // Close artifact when artifact is visible
      setArtifact((currentArtifact) =>
        currentArtifact.status === "streaming"
          ? {
              ...currentArtifact,
              isVisible: false,
            }
          : { ...initialArtifactData, status: "idle" }
      );
    } else {
      // Close chat sidebar when no artifact
      toggleSidebar();
    }
  };

  // Reset expanded mode when sidebar is closed
  useEffect(() => {
    if (!open && isExpandedMode) {
      setIsExpandedMode(false);
      localStorage.setItem("sidebar-expanded-mode", "false");
      // Dispatch event to notify SidebarWidthManager
      window.dispatchEvent(
        new CustomEvent("sidebar-expanded-toggle", { detail: false })
      );
    }
  }, [open, isExpandedMode]);

  const chatIdFromUrl = searchParams.get("chatId");
  const chatId = chatIdFromUrl || initialChatId;
  // Mock mode reviews the Eve pane, so it mounts that pane regardless of the
  // runtime flag. History stays on the real flag — it still talks to the API.
  const agentMockMode = useAgentMockMode();
  const showAgentPane =
    USE_EVE_AGENT || (MOCK_MODE_AVAILABLE && agentMockMode.enabled);
  const [hasMessages, setHasMessages] = useState(initialMessages.length > 0);
  const [artifactProps, setArtifactProps] = useState<{
    addToolApprovalResponse: ChatAddToolApproveResponseFunction;
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
  } | null>(null);

  const handleNewChat = () => {
    const newChatId = generateUUID();
    const params = new URLSearchParams(searchParams.toString());
    params.set("chatId", newChatId);
    router.replace(`?${params.toString()}`, { scroll: false });
    setHasMessages(false);
  };

  const handleMessagesChange = (messages: ChatMessage[]) => {
    setHasMessages(messages.length > 0);
    onMessagesChange?.(messages);
  };

  const handleEveMessagesChange = (nextHasMessages: boolean) => {
    setHasMessages(nextHasMessages);
  };

  useEffect(() => {
    if (!isArtifactVisible) {
      setArtifactProps(null);
    }
  }, [isArtifactVisible]);

  // Clear artifact props when chatId changes
  useEffect(() => {
    setArtifactProps(null);
  }, []);

  return (
    <>
      <Sidebar
        className={cn(
          chatSidebarSide === "right" ? "md:order-last" : "md:order-first",
          "**:data-[sidebar=sidebar]:bg-transparent! **:data-[slot=sidebar-container]:p-0!"
        )}
        side={chatSidebarSide}
        variant="inset"
      >
        <SidebarHeader>
          <SidebarMenu>
            <div
              className={cn(
                "flex flex-row items-center justify-between gap-2 p-1 transition-opacity duration-250 ease-in-out",
                chatSidebarSide === "left" && "flex-row-reverse",
                open ? "opacity-100" : "opacity-0",
                !controlsReady && "pointer-events-none"
              )}
            >
              <div
                className={cn(
                  "flex flex-row items-center gap-1",
                  chatSidebarSide === "left" && "flex-row-reverse"
                )}
              >
                {!!hasMessages && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="h-8 p-1 md:h-fit md:p-2"
                        onClick={handleNewChat}
                        type="button"
                        variant="ghost"
                      >
                        <PlusIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      New Chat
                    </TooltipContent>
                  </Tooltip>
                )}
                <DropdownMenu>
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8 p-1 opacity-50 hover:opacity-100 md:h-fit md:p-2"
                          type="button"
                          variant="ghost"
                        >
                          <ClockRewind />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      Chat History
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-[400px] w-64 overflow-y-auto p-0"
                  >
                    <div className="p-2">
                      {USE_EVE_AGENT ? (
                        <SidebarAgentHistory />
                      ) : (
                        <SidebarHistory
                          initialHistory={initialHistory}
                          user={user}
                        />
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div
                className={cn(
                  "flex flex-row items-center gap-1",
                  chatSidebarSide === "left" && "flex-row-reverse"
                )}
              >
                <Tooltip delayDuration={1000}>
                  <TooltipTrigger asChild>
                    <Button
                      className={cn(
                        "h-8 p-1 opacity-50 hover:opacity-100 md:h-fit md:p-2",
                        isExpandedMode && "bg-accent opacity-100"
                      )}
                      onClick={handleExpandedToggle}
                      type="button"
                      variant="ghost"
                    >
                      {isExpandedMode ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="hidden md:block">
                    {isExpandedMode ? "Exit Expanded" : "Expand Chat"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={1000}>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-8 p-1 opacity-50 hover:opacity-100 md:h-fit md:p-2"
                      onClick={handleCloseClick}
                      type="button"
                      variant="ghost"
                    >
                      {isArtifactVisible ? (
                        <FileXCorner className="h-4 w-4" />
                      ) : (
                        <CrossIcon />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="hidden md:block">
                    {isArtifactVisible ? "Close Artifact" : "Close Sidebar"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="relative flex flex-col overflow-hidden">
          <div
            className={
              isArtifactVisible
                ? "flex h-full flex-row overflow-hidden"
                : "flex h-full flex-col overflow-hidden"
            }
          >
            <div
              className={
                isArtifactVisible
                  ? "flex min-w-0 flex-1 flex-col overflow-hidden border-border border-r"
                  : "flex h-full flex-1 flex-col overflow-hidden"
              }
            >
              {showAgentPane ? (
                <AgentSidebarContent
                  initialChatModel={initialChatModel}
                  key={chatId}
                  onMessagesChange={handleEveMessagesChange}
                  threadId={chatId}
                />
              ) : (
                <ChatSidebarContent
                  autoResume={!!chatIdFromUrl}
                  chatId={chatId}
                  initialChatModel={initialChatModel}
                  initialMessages={initialMessages}
                  initialVisibilityType={initialVisibilityType}
                  isReadonly={isReadonly}
                  key={chatId}
                  onArtifactPropsReady={setArtifactProps}
                  onMessagesChange={handleMessagesChange}
                />
              )}
            </div>
            {!!isArtifactVisible && artifactProps && (
              <div className="flex min-w-0 flex-[2] flex-col overflow-hidden">
                <Artifact {...artifactProps} variant="sidebar" />
              </div>
            )}
          </div>
        </SidebarContent>
        <ChatSidebarResizeHandle isExpandedMode={isExpandedMode} />
      </Sidebar>
      <DataStreamHandler />
    </>
  );
}

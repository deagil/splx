"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { MentionableItem, UrlMention } from "@/lib/types/mentions";
import type { Skill } from "@/hooks/use-skills";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { useUrlDetection, extractUrls, toUrlMention } from "@/hooks/use-url-detection";
import {
  PromptInput,
  PromptInputSubmit,
} from "../elements/prompt-input";
import {
  ArrowUpIcon,
  PaperclipIcon,
  StopIcon,
} from "../shared/icons";
import { AtSign, Zap } from "lucide-react";
import type { PlateChatInputRef } from "./plate-chat-input";
import { SuggestedActions } from "../shared/suggested-actions";
import { Button } from "@/components/ui/button";
import type { VisibilityType } from "../shared/visibility-selector";
import { PlateChatInput } from "./plate-chat-input";
import { useMentionableItems } from "@/hooks/use-mentionable-items";
import { ContextTray, buildContextItems } from "./context-tray";
import { Loader } from "../elements/loader";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  usage,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  usage?: AppUsage;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plateInputRef = useRef<PlateChatInputRef>(null);
  const { width } = useWindowSize();
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/";

  // Get mentionable items for @ mentions
  const mentionableItems = useMentionableItems();

  // Track mentions separately from input text
  const [mentions, setMentions] = useState<MentionableItem["mention"][]>([]);
  
  // Track selected skill from slash commands
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // URL detection for auto-detecting pasted URLs
  const {
    detectedUrls,
    isLoading: isLoadingUrls,
    addUrl,
    removeUrl,
    clearUrls,
    getUrlMentions,
  } = useUrlDetection();

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }
  }, []);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustHeight, localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  // Detect URLs in input text
  useEffect(() => {
    if (input) {
      const urls = extractUrls(input);
      for (const url of urls) {
        addUrl(url);
      }
    }
  }, [input, addUrl]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const submitForm = useCallback(() => {
    // Only navigate if not on dashboard route
    if (!isDashboardRoute) {
      window.history.pushState({}, "", `?chatId=${chatId}`);
    }

    // Validate mentions before sending
    const validMentions = mentions.filter((mention) => {
      // Basic validation
      if (!mention.type || !mention.label) return false;
      // Type-specific validation
      if (mention.type === "table" && !("tableName" in mention)) return false;
      if (mention.type === "record" && (!("tableName" in mention) || !("recordId" in mention))) return false;
      if (mention.type === "block" && !("blockId" in mention)) return false;
      return true;
    });

    // Get URL mentions to include with the message
    const currentUrlMentions = getUrlMentions();

    // Combine regular mentions with URL mentions
    const allMentions = [...validMentions, ...currentUrlMentions];

    // Include mentions in the message - using type assertion since
    // the AI SDK transport will preserve custom fields even if not in the type
    const messageToSend: any = {
      role: "user",
      parts: [
        ...attachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text",
          text: input,
        },
      ],
    };

    // Add mentions as custom field (will be preserved and sent to server)
    if (allMentions.length > 0) {
      messageToSend.mentions = allMentions;
    }

    // Add selected skill as custom field (will be used for context/system prompt)
    if (selectedSkill) {
      messageToSend.skill = {
        id: selectedSkill.id,
        name: selectedSkill.name,
        command: selectedSkill.command,
        prompt: selectedSkill.prompt,
      };
    }

    sendMessage(messageToSend);

    setAttachments([]);
    setMentions([]);
    setSelectedSkill(null);
    setInput("");
    clearUrls();
    setLocalStorageInput("");
    resetHeight();
  }, [
    input,
    setInput,
    mentions,
    selectedSkill,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    chatId,
    resetHeight,
    isDashboardRoute,
    getUrlMentions,
    clearUrls,
  ]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );
  
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith('image/'),
      );

      if (imageItems.length === 0) return;

      // Prevent default paste behavior for images
      event.preventDefault();

      setUploadQueue((prev) => [...prev, 'Pasted image']);

      try {
        const uploadPromises = imageItems.map(async (item) => {
          const file = item.getAsFile();
          if (!file) return;
          return uploadFile(file);
        });

        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) =>
            attachment !== undefined &&
            attachment.url !== undefined &&
            attachment.contentType !== undefined,
        );

        setAttachments((curr) => [
          ...curr,
          ...(successfullyUploadedAttachments as Attachment[]),
        ]);
      } catch (error) {
        console.error('Error uploading pasted images:', error);
        toast.error('Failed to upload pasted image(s)');
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  // Add paste event listener to textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('paste', handlePaste);
    return () => textarea.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Build unified context items for the tray (including URL mentions)
  const urlMentions = getUrlMentions();
  const contextItems = buildContextItems(
    selectedSkill,
    mentions,
    attachments,
    urlMentions
  );

  // Handle removing context items
  const handleRemoveContextItem = useCallback((id: string) => {
    if (id.startsWith("skill-")) {
      setSelectedSkill(null);
    } else if (id.startsWith("url-")) {
      // Extract the URL from the ID (format: url-{url})
      const url = id.replace("url-", "");
      removeUrl(url);
    } else if (id.startsWith("mention-")) {
      // Extract the index from the ID (format: mention-{index})
      const idx = Number.parseInt(id.replace("mention-", ""), 10);
      // Remove the mention node from the Plate editor
      plateInputRef.current?.removeMentionByIndex(idx);
      // Also remove from state (will be synced from editor anyway but do it for immediate feedback)
      setMentions((prev) => prev.filter((_, i) => i !== idx));
    } else if (id.startsWith("file-")) {
      const url = id.replace("file-", "");
      setAttachments((prev) => prev.filter((a) => a.url !== url && a.name !== url));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [setAttachments, removeUrl]);

  // Check if input is empty (for suggestions visibility)
  const isInputEmpty = input.trim() === "";

  return (
    <div className={cn("relative flex w-full flex-col", className)}>
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 &&
        isInputEmpty && (
          <div className="px-2 pb-2 md:px-4">
            <SuggestedActions
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
              sendMessage={sendMessage}
            />
          </div>
        )}

      <input
        className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <div className="flex flex-col w-full">
        <PromptInput
          className="rounded-xl border border-border bg-background shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
          onSubmit={(event) => {
            event.preventDefault();
            if (status !== "ready") {
              toast.error("Please wait for the model to finish its response!");
            } else {
              submitForm();
            }
          }}
        >
          {/* Unified Context Tray - shows skills, mentions, URLs, and attachments */}
          {(contextItems.length > 0 || uploadQueue.length > 0 || isLoadingUrls) && (
            <div className="px-3 pt-3" data-testid="context-preview">
              {(uploadQueue.length > 0 || isLoadingUrls) && (
                <div className="flex items-center gap-2 mb-2">
                  {uploadQueue.map((filename) => (
                    <div
                      key={filename}
                      className="flex items-center gap-1.5 h-8 rounded-lg border border-border bg-muted/50 px-2.5"
                    >
                      <Loader size={14} />
                      <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                        {filename}
                      </span>
                    </div>
                  ))}
                  {isLoadingUrls && (
                    <div className="flex items-center gap-1.5 h-8 rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-2.5">
                      <Loader size={14} />
                      <span className="text-sm text-muted-foreground">
                        Fetching URL preview...
                      </span>
                    </div>
                  )}
                </div>
              )}
              <ContextTray
                items={contextItems}
                onRemoveItem={handleRemoveContextItem}
              />
            </div>
          )}
          
          {/* Input area - full width */}
          <div className="px-3 pt-3">
            <PlateChatInput
              ref={plateInputRef}
              value={input}
              onChange={setInput}
              onMentionsChange={setMentions}
              onSkillSelect={setSelectedSkill}
              mentionableItems={mentionableItems}
              placeholder="Send a message..."
              disabled={status !== "ready"}
              autoFocus={width !== undefined && width > 768}
              className="w-full min-h-[80px]"
            />
          </div>
          
          {/* Bottom control bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-1">
              <AttachmentsButton
                fileInputRef={fileInputRef}
                selectedModelId={selectedModelId}
                status={status}
              />
              <Button
                className="aspect-square h-7 w-7 rounded-md p-0 transition-colors hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                data-testid="mention-trigger-button"
                disabled={status !== "ready"}
                onClick={(event) => {
                  event.preventDefault();
                  plateInputRef.current?.triggerMention();
                }}
                variant="ghost"
                type="button"
                title="Add context with @"
              >
                <AtSign size={12} style={{ width: 12, height: 12 }} />
              </Button>
              <Button
                className="aspect-square h-7 w-7 rounded-md p-0 transition-colors hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                data-testid="slash-command-trigger-button"
                disabled={status !== "ready"}
                onClick={(event) => {
                  event.preventDefault();
                  plateInputRef.current?.triggerSlashCommand();
                }}
                variant="ghost"
                type="button"
                title="Use a skill with /"
              >
                <Zap size={12} style={{ width: 12, height: 12 }} />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              {status === "submitted" ? (
                <StopButton setMessages={setMessages} stop={stop} />
              ) : (
                <PromptInputSubmit
                  className="size-7 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                  disabled={!input.trim() || uploadQueue.length > 0}
                  status={status}
                  data-testid="send-button"
                >
                  <ArrowUpIcon size={12} />
                </PromptInputSubmit>
              )}
            </div>
          </div>
        </PromptInput>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) return false;
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;

    return true;
  }
);

function PureAttachmentsButton({
  fileInputRef,
  status,
  selectedModelId,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
  selectedModelId: string;
}) {
  const isReasoningModel = selectedModelId === "chat-model-reasoning";

  return (
    <Button
      className="aspect-square h-7 w-7 rounded-md p-0 transition-colors hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
      data-testid="attachments-button"
      disabled={status !== "ready" || isReasoningModel}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={12} style={{ width: 12, height: 12 }} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      className="size-7 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={12} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

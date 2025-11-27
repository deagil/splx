"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMentionableItems } from "@/hooks/use-mentionable-items";
import type { MentionableItem } from "@/lib/types/mentions";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * General chat help dialog with guide on how to use all aspects of the chat
 */
export function ChatHelpDialog() {
  const mentionableItems = useMentionableItems();

  // Group mentions by type
  const groupedMentions = useMemo(() => {
    const groups: Record<string, MentionableItem[]> = {
      page: [],
      block: [],
      table: [],
      record: [],
      user: [],
      lookup: [],
    };

    mentionableItems.forEach((item) => {
      const type = item.mention.type;
      if (type in groups) {
        groups[type].push(item);
      }
    });

    return groups;
  }, [mentionableItems]);

  const typeLabels: Record<string, { label: string; description: string; color: string }> = {
    page: {
      label: "Pages",
      description: "Reference all data from a page",
      color: "bg-blue-500/10 text-blue-500",
    },
    block: {
      label: "Blocks",
      description: "Reference specific block data",
      color: "bg-purple-500/10 text-purple-500",
    },
    table: {
      label: "Tables",
      description: "Query data from tables",
      color: "bg-green-500/10 text-green-500",
    },
    record: {
      label: "Records",
      description: "Reference specific records",
      color: "bg-orange-500/10 text-orange-500",
    },
    user: {
      label: "Users",
      description: "Reference user profiles",
      color: "bg-pink-500/10 text-pink-500",
    },
    lookup: {
      label: "Lookups",
      description: "Generic data lookups",
      color: "bg-gray-500/10 text-gray-500",
    },
  };

  const totalMentions = mentionableItems.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 p-1 text-xs text-muted-foreground/50 hover:text-foreground md:h-fit md:p-2 transition-opacity"
          title="Chat Help"
        >
          <HelpCircle size={12} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chat Help Guide</DialogTitle>
          <DialogDescription>
            Learn how to use all features of the chat interface
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Usage */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Getting Started</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                The chat interface allows you to interact with AI models to get help, generate
                content, and analyze data.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Type your message in the input field at the bottom</li>
                <li>Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Enter</kbd> to send</li>
                <li>Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Shift + Enter</kbd> for a new line</li>
                <li>Use the attachment button to upload files or images</li>
              </ul>
            </div>
          </section>

          {/* Mentions */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mentions</h3>
              {totalMentions > 0 && (
                <Badge variant="secondary">{totalMentions} available</Badge>
              )}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Use <code className="rounded bg-muted px-1.5 py-0.5 text-xs">@</code> mentions to
                reference data from your workspace. This provides context to the AI about your data.
              </p>
              <div className="space-y-1">
                <p className="font-medium text-foreground">How to use mentions:</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Type <code className="rounded bg-muted px-1.5 py-0.5 text-xs">@</code> in the chat input</li>
                  <li>Select a mention from the dropdown menu</li>
                  <li>The mention appears as a chip above the input</li>
                  <li>Send your message - the AI receives context about mentioned data</li>
                </ol>
              </div>
            </div>

            {totalMentions > 0 ? (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                {Object.entries(groupedMentions).map(([type, items]) => {
                  if (items.length === 0) return null;

                  const typeInfo = typeLabels[type];
                  if (!typeInfo) return null;

                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("font-medium", typeInfo.color)}>
                          {typeInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{typeInfo.description}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.slice(0, 6).map((item) => (
                          <div
                            key={item.key}
                            className="rounded-lg border bg-card p-2.5 text-xs transition-colors hover:bg-accent"
                          >
                            <code className="block truncate font-mono font-medium text-foreground">
                              {item.text}
                            </code>
                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {items.length > 6 && (
                        <p className="text-xs text-muted-foreground">
                          +{items.length - 6} more {typeInfo.label.toLowerCase()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                <p>No mentions available.</p>
                <p className="mt-1">
                  Navigate to a page with blocks or create tables to see mentionable items.
                </p>
              </div>
            )}
          </section>

          {/* Attachments */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Attachments</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>You can attach files and images to your messages:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Click the paperclip icon to browse and select files</li>
                <li>Or paste images directly into the input field</li>
                <li>Supported formats: images, documents, and more</li>
                <li>Attachments appear as previews above the input</li>
              </ul>
            </div>
          </section>

          {/* Model Selection */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Model Selection</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Choose different AI models based on your needs. Use the model selector in the status
                bar to switch between available models.
              </p>
              <p>
                <strong>Quick switch:</strong> Press{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Ctrl + M</kbd> to cycle
                through available models without interrupting your workflow.
              </p>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Send message</span>
                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-medium">Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">New line</span>
                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-medium">Shift + Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Toggle sidebar</span>
                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-medium">Cmd/Ctrl + B</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Cycle models</span>
                    <kbd className="rounded bg-muted px-2 py-1 text-xs font-medium">Ctrl + M</kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Visibility */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Chat Visibility</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Control who can see your chats using the visibility selector in the header:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Private:</strong> Only you can see this chat
                </li>
                <li>
                  <strong>Team:</strong> Visible to your team members
                </li>
                <li>
                  <strong>Public:</strong> Visible to everyone in your workspace
                </li>
              </ul>
            </div>
          </section>

          {/* Tips */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Tips & Best Practices</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc space-y-1 pl-5">
                <li>Be specific in your questions for better responses</li>
                <li>Use mentions to provide context about your data</li>
                <li>You can edit messages before sending</li>
                <li>Use the stop button to cancel a response in progress</li>
                <li>Chat history is saved automatically</li>
              </ul>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}



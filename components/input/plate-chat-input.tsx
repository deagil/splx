"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plate, usePlateEditor } from "platejs/react";
import { normalizeNodeId } from "platejs";
import { ParagraphPlugin } from "@platejs/basic-nodes/react";
import { BaseMentionPlugin } from "@platejs/mention";
import { MentionElement } from "@/components/ui/mention-node";
import { MentionInputElement } from "@/components/input/mention-input-element";
import { Editor, EditorContainer } from "@/components/ui/editor";
import type { MentionableItem } from "@/lib/types/mentions";
import {
  mentionableItemsToPlateMentions,
  parsePlateMentionValue,
} from "@/lib/plate/mention-config";
import { cn } from "@/lib/utils";

export type PlateChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: MentionableItem["mention"][]) => void;
  mentionableItems: MentionableItem[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * Plate-based chat input with @ mention support
 */
export function PlateChatInput({
  value,
  onChange,
  onMentionsChange,
  mentionableItems,
  placeholder = "Send a message...",
  className,
  disabled = false,
  autoFocus = false,
}: PlateChatInputProps) {
  const plateMentions = useMemo(
    () => mentionableItemsToPlateMentions(mentionableItems),
    [mentionableItems]
  );

  const initialValue = useMemo(
    () =>
      normalizeNodeId([
        {
          type: "p",
          children: value ? [{ text: value }] : [],
        },
      ]),
    []
  );

  const editor = usePlateEditor({
    plugins: [
      ParagraphPlugin,
      BaseMentionPlugin.configure({
        options: {
          trigger: "@",
          createMentionNode: (item) => ({
            value: item.value,
            children: [{ text: item.text }],
          }),
        },
      }),
    ],
    value: initialValue,
  });

  // Extract text and mentions from editor
  const extractContent = useCallback(() => {
    if (!editor) return { text: "", mentions: [] };

    const nodes = editor.children;
    const textParts: string[] = [];
    const mentions: MentionableItem["mention"][] = [];

    function traverseNode(node: unknown) {
      if (typeof node !== "object" || node === null) return;

      if ("type" in node) {
        if (node.type === "mention" && "value" in node) {
          const mentionValue = parsePlateMentionValue(String(node.value));
          if (mentionValue) {
            mentions.push(mentionValue);
            // Add mention text to output
            if ("children" in node && Array.isArray(node.children)) {
              const mentionText = node.children
                .map((child) => ("text" in child ? String(child.text) : ""))
                .join("");
              textParts.push(`@${mentionText}`);
            }
          }
        } else if ("children" in node && Array.isArray(node.children)) {
          node.children.forEach(traverseNode);
        }
      } else if (Array.isArray(node)) {
        node.forEach(traverseNode);
      }
    }

    nodes.forEach(traverseNode);

    // Also extract plain text from paragraphs
    nodes.forEach((node) => {
      if (
        typeof node === "object" &&
        node !== null &&
        "type" in node &&
        node.type === "p" &&
        "children" in node &&
        Array.isArray(node.children)
      ) {
        node.children.forEach((child) => {
          if (
            typeof child === "object" &&
            child !== null &&
            "text" in child &&
            typeof child.text === "string" &&
            !("type" in child && child.type === "mention")
          ) {
            textParts.push(child.text);
          }
        });
      }
    });

    const text = textParts.join(" ").trim();

    return { text, mentions };
  }, [editor]);

  // Handle editor changes
  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      const { text, mentions } = extractContent();
      onChange(text);
      onMentionsChange?.(mentions);
    };

    // Use Plate's onChange
    editor.onChange = handleChange;
  }, [editor, onChange, onMentionsChange, extractContent]);

  return (
    <div className={cn("w-full", className)}>
      <Plate editor={editor}>
        <EditorContainer variant="select">
          <Editor
            variant="select"
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
          />
        </EditorContainer>
      </Plate>
    </div>
  );
}


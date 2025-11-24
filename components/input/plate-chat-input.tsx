"use client";

import { useCallback, useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import { Plate, usePlateEditor, ParagraphPlugin } from "platejs/react";
import { normalizeNodeId } from "platejs";
import { MentionPlugin, MentionInputPlugin } from "@platejs/mention/react";
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
  onTriggerMention?: () => void;
};

export type PlateChatInputRef = {
  triggerMention: () => void;
};

/**
 * Plate-based chat input with @ mention support
 */
export const PlateChatInput = forwardRef<PlateChatInputRef, PlateChatInputProps>(function PlateChatInput({
  value,
  onChange,
  onMentionsChange,
  mentionableItems,
  placeholder = "Send a message...",
  className,
  disabled = false,
  autoFocus = false,
  onTriggerMention,
}, ref) {
  const plateMentions = useMemo(
    () => mentionableItemsToPlateMentions(mentionableItems),
    [mentionableItems]
  );

  // Convert string value to Plate value format
  // Only initialize once - editor should be mostly uncontrolled
  const initialValue = useMemo(
    () =>
      normalizeNodeId([
        {
          type: "p",
          children: [{ text: "" }],
        },
      ]),
    []
  );

  // Create a wrapper component that injects mentionableItems
  const MentionInputElementWithItems = useMemo(
    () => (props: Parameters<typeof MentionInputElement>[0]) => (
      <MentionInputElement {...props} mentionableItems={mentionableItems} />
    ),
    [mentionableItems]
  );

  const editor = usePlateEditor({
    plugins: [
      ParagraphPlugin,
      MentionPlugin.configure({
        options: {
          trigger: "@",
          triggerPreviousCharPattern: /^$|^[\s"']$/,
          insertSpaceAfterMention: false,
        },
      }).withComponent(MentionElement),
      MentionInputPlugin.withComponent(MentionInputElementWithItems),
    ],
    value: initialValue,
  });

  // Expose triggerMention method via ref
  useImperativeHandle(ref, () => ({
    triggerMention: () => {
      if (!editor || disabled) return;
      try {
        // Insert "@" at the current cursor position
        editor.tf.insertText("@");
        // Focus the editor to ensure the mention menu opens
        editor.tf.focus();
        // Call the callback if provided
        onTriggerMention?.();
      } catch (error) {
        console.warn("Error triggering mention:", error);
      }
    },
  }), [editor, disabled, onTriggerMention]);

  // Track if we're updating from external value change (to avoid loops)
  const isExternalUpdate = useRef(false);

  // Extract text and mentions from editor value
  const extractContent = useCallback((editorInstance: typeof editor) => {
    const textParts: string[] = [];
    const mentions: MentionableItem["mention"][] = [];

    // Get children from editor instance
    const editorValue = editorInstance.children;
    if (!Array.isArray(editorValue)) {
      return { text: "", mentions: [] };
    }

    // Create a lookup map for mentionable items by key and text
    const mentionableByKey = new Map(mentionableItems.map(item => [item.key, item.mention]));
    const mentionableByText = new Map(mentionableItems.map(item => [item.text, item.mention]));

    function traverseChildren(children: unknown[]): void {
      children.forEach((child) => {
        if (typeof child !== "object" || child === null) return;


        // Check if it's a mention node
        // Plate mentions can have type "mention" or be identified by having a "value" property
        // that contains JSON stringified mention data
        const hasValue = "value" in child && child.value != null;
        const isMentionType = "type" in child && (child.type === "mention" || child.type === "mention_input");
        
        // Try to parse as mention if it has a value (even if type doesn't match, in case structure is different)
        if (hasValue || isMentionType) {
          try {
            const valueStr = String(child.value || "");
            let mentionValue: MentionableItem["mention"] | null = null;
            
            // First, try to parse as JSON (mention values should be JSON stringified)
            try {
              mentionValue = parsePlateMentionValue(valueStr);
            } catch (e) {
              // JSON parsing failed, will try lookup below
            }
            
            // If parsing returned null or failed, try to look up by key or text
            if (!mentionValue && isMentionType) {
              // Try to find by key first
              if ("key" in child && typeof child.key === "string") {
                mentionValue = mentionableByKey.get(child.key) || null;
              }
              
              // If not found by key, try to find by the value text (without @)
              if (!mentionValue && valueStr) {
                const textWithoutAt = valueStr.startsWith("@") ? valueStr.slice(1) : valueStr;
                mentionValue = mentionableByText.get(textWithoutAt) || null;
              }
              
              // Last resort: try to find by any text in children
              if (!mentionValue && "children" in child && Array.isArray(child.children)) {
                for (const c of child.children) {
                  if (typeof c === "object" && c !== null && "text" in c) {
                    const childText = String(c.text);
                    const textWithoutAt = childText.startsWith("@") ? childText.slice(1) : childText;
                    mentionValue = mentionableByText.get(textWithoutAt) || null;
                    if (mentionValue) break;
                  }
                }
              }
            }
            
            if (mentionValue) {
              mentions.push(mentionValue);
              // Add mention text to output - try multiple ways to get the text
              let mentionText = "";
              
              // Try to get text from children first
              if ("children" in child && Array.isArray(child.children)) {
                mentionText = child.children
                  .map((c) => {
                    if (typeof c === "object" && c !== null && "text" in c) {
                      return String(c.text);
                    }
                    return "";
                  })
                  .join("");
              }
              
              // Fallback: try to get text from the mention value or other properties
              if (!mentionText && "text" in child) {
                mentionText = String(child.text);
              }
              
              // If we still don't have text, use the label from the mention value
              if (!mentionText && mentionValue.label) {
                mentionText = mentionValue.label;
              }
              
              // Last resort: try to extract from the value string itself
              if (!mentionText && valueStr) {
                try {
                  const parsed = JSON.parse(valueStr);
                  if (parsed && typeof parsed === "object" && "label" in parsed) {
                    mentionText = String(parsed.label);
                  }
                } catch (e) {
                  // Not JSON, ignore
                }
              }
              
              if (mentionText) {
                // Don't add @ prefix here - it's already in the mention element
                textParts.push(mentionText);
              }
              
              // Skip further processing of this node's children since we've handled it
              return;
            }
          } catch (error) {
            // Not a mention, continue processing
          }
        }
        
        // Check if it's a text node (but not inside a mention)
        else if ("text" in child && typeof child.text === "string" && !("type" in child && child.type === "mention")) {
          textParts.push(child.text);
        }
        // If it has children, traverse them
        else if ("children" in child && Array.isArray(child.children)) {
          traverseChildren(child.children);
        }
      });
    }

    // Traverse all top-level nodes (usually paragraphs)
    editorValue.forEach((node) => {
      if (
        typeof node === "object" &&
        node !== null &&
        "children" in node &&
        Array.isArray(node.children)
      ) {
        traverseChildren(node.children);
      }
    });

    const text = textParts.join("").trim();

    return { text, mentions };
  }, [mentionableItems]);

  // Handle editor changes via Plate's onChange
  // Plate's onChange receives the editor instance
  const handleChange = useCallback(() => {
    if (!editor) {
      console.log("[PlateChatInput] handleChange: no editor");
      return;
    }
    if (isExternalUpdate.current) {
      console.log("[PlateChatInput] handleChange: skipping external update");
      isExternalUpdate.current = false;
      return;
    }

    const { text, mentions } = extractContent(editor);
    
    onChange(text);
    onMentionsChange?.(mentions);
  }, [editor, onChange, onMentionsChange, extractContent]);

  // Sync external value changes to editor (only when value is cleared externally)
  // This happens after form submission
  useEffect(() => {
    if (!editor) return;

    // Get current text using extractContent
    const { text: currentText } = extractContent(editor);
    // Only reset if value was cleared externally (e.g., after submit)
    if (value === "" && currentText !== "") {
      isExternalUpdate.current = true;
      // Use requestAnimationFrame to ensure this happens after React's render cycle
      requestAnimationFrame(() => {
        try {
          editor.tf.setValue(initialValue);
          // Clear any selection and ensure editor is focused
          editor.tf.select({ anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 0 } });
          // Ensure editor is enabled and ready
          if (!disabled) {
            // Small delay to ensure editor is fully reset before focusing
            setTimeout(() => {
              try {
                editor.tf.focus();
              } catch (focusError) {
                // Ignore focus errors
              }
            }, 50);
          }
        } catch (error) {
          console.warn("Error resetting Plate editor:", error);
        }
      });
    }
  }, [editor, value, initialValue, extractContent, disabled]);

  // Focus editor when it becomes enabled (status returns to "ready")
  // Also focus after reset to ensure it's ready for input
  useEffect(() => {
    if (!editor || disabled) return;
    
    // Use requestAnimationFrame for better timing
    let timeoutId: NodeJS.Timeout | null = null;
    const rafId = requestAnimationFrame(() => {
      // Small delay to ensure the editor is fully enabled and reset
      timeoutId = setTimeout(() => {
        try {
          // Check if editor is empty, if so focus it
          const { text } = extractContent(editor);
          if (text === "" || text.trim() === "") {
            editor.tf.focus();
          }
        } catch (error) {
          // Ignore focus errors (editor might not be ready)
        }
      }, 100);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [editor, disabled, extractContent]);

  return (
    <div className={cn("w-full min-h-[80px] flex items-start", className)}>
      <Plate editor={editor} onChange={handleChange}>
        <EditorContainer variant="select" className="min-h-[80px] flex-1">
          <Editor
            variant="select"
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className="min-h-[80px] py-2"
          />
        </EditorContainer>
      </Plate>
    </div>
  );
});


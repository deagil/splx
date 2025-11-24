/**
 * Server-side mention enrichment
 * Converts mention parts to text context for AI model
 */

import type { ChatMessage } from "@/lib/types";
import type { Mention, MentionPart } from "@/lib/types/mentions";
import { extractMentionData } from "./extract";

/**
 * Extract mentions from message
 * Mentions can be stored in:
 * 1. A custom `mentions` field on the message object (preferred)
 * 2. Message parts (if the client sends them that way)
 */
export function extractMentionsFromMessage(
  message: ChatMessage & { mentions?: MentionPart["mention"][] }
): MentionPart[] {
  const mentions: MentionPart[] = [];

  // First, check for mentions in custom field (preferred approach)
  if (message.mentions && Array.isArray(message.mentions)) {
    return message.mentions.map((mention) => ({
      type: "mention" as const,
      mention,
    }));
  }

  // Fallback: try to extract from parts (if client sends them as parts)
  // Note: AI SDK doesn't officially support custom part types, so this uses type assertions
  if (message.parts) {
    for (const part of message.parts) {
      // Type guard to check if this is a mention part
      // We use a type assertion since AI SDK types don't include our custom type
      const partAny = part as { type?: string; mention?: MentionPart["mention"] };
      if (partAny.type === "mention" && partAny.mention) {
        mentions.push({
          type: "mention",
          mention: partAny.mention,
        });
      }
    }
  }

  return mentions;
}

/**
 * Enrich message with mention data
 * Returns the enriched text that should be added to the message
 * This converts mentions to text context that will be included with the user's message
 */
export async function enrichMessageWithMentions(
  message: ChatMessage & { mentions?: MentionPart["mention"][] }
): Promise<string> {
  const mentions = extractMentionsFromMessage(message);

  if (mentions.length === 0) {
    return "";
  }

  // Extract data for each mention and convert to text
  const mentionContexts = await Promise.all(
    mentions.map(async (mentionPart) => {
      // mentionPart.mention is already properly typed as Mention union
      const mention = mentionPart.mention as Mention;
      const data = await extractMentionData(mention);
      return `\n\n---\n${data}\n---\n`;
    })
  );

  return mentionContexts.join("\n");
}

/**
 * Create enriched message content
 * Combines original message text with mention context
 * Mentions are converted to text and included with the user's message
 */
export async function createEnrichedMessageContent(
  message: ChatMessage & { mentions?: MentionPart["mention"][] }
): Promise<string> {
  // Extract the original user message text
  const originalText = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join(" ") || "";

  // Extract and enrich mentions (convert to text)
  const mentionContext = await enrichMessageWithMentions(message);

  // If no mentions, return original text
  if (!mentionContext || !mentionContext.trim()) {
    return originalText;
  }

  // Combine mention context with user message
  // Format: [Mention contexts]\n\nUser message: [original text]
  return `${mentionContext}\n\nUser message: ${originalText}`;
}


/**
 * Server-side mention enrichment
 * Converts mention parts to text context for AI model
 */

import type { ChatMessage } from "@/lib/types";
import type { MentionPart } from "@/lib/types/mentions";
import { extractMentionData } from "./extract";

/**
 * Extract mentions from message
 * Mentions are sent as a custom field on the message object
 */
export function extractMentionsFromMessage(
  message: any
): MentionPart[] {
  // Check if message has mentions field (sent from client)
  if (message.mentions && Array.isArray(message.mentions)) {
    return message.mentions.map((mention: any) => ({
      type: "mention" as const,
      mention,
    }));
  }

  return [];
}

/**
 * Enrich message with mention data
 * Returns the enriched text that should be added to the message
 */
export async function enrichMessageWithMentions(
  message: ChatMessage
): Promise<string> {
  const mentions = extractMentionsFromMessage(message);

  if (mentions.length === 0) {
    return "";
  }

  // Extract data for each mention
  const mentionContexts = await Promise.all(
    mentions.map(async (mentionPart) => {
      const mention = mentionPart.mention;
      const data = await extractMentionData(mention);
      return `\n\n---\n${data}\n---\n`;
    })
  );

  return mentionContexts.join("\n");
}

/**
 * Create enriched message content
 * Combines original message text with mention context
 */
export async function createEnrichedMessageContent(
  message: ChatMessage
): Promise<string> {
  const originalText = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join(" ") || "";

  const mentionContext = await enrichMessageWithMentions(message);

  if (!mentionContext) {
    return originalText;
  }

  // Prepend mention context to the message
  return `${mentionContext}\n\nUser message: ${originalText}`;
}


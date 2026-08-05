import { z } from "zod";
import {
  blockMentionSchema,
  lookupMentionSchema,
  pageMentionSchema,
  recordMentionSchema,
  tableMentionSchema,
  urlMentionSchema,
  userMentionSchema,
} from "@/lib/types/mentions";

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(["text"]),
});

const filePartSchema = z.object({
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  type: z.enum(["file"]),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

// Mention schema - union of all mention types
const mentionSchema = z.union([
  pageMentionSchema,
  blockMentionSchema,
  tableMentionSchema,
  recordMentionSchema,
  userMentionSchema,
  lookupMentionSchema,
  urlMentionSchema,
]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    mentions: z.array(mentionSchema).optional(), // Allow mentions as optional field
    parts: z.array(partSchema),
    role: z.enum(["user"]),
  }),
  personalizationEnabled: z.boolean().optional(),
  selectedChatModel: z.enum(["chat-model", "chat-model-reasoning"]),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

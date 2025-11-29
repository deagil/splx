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
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
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
    role: z.enum(["user"]),
    parts: z.array(partSchema),
    mentions: z.array(mentionSchema).optional(), // Allow mentions as optional field
  }),
  selectedChatModel: z.enum(["chat-model", "chat-model-reasoning"]),
  selectedVisibilityType: z.enum(["public", "private"]),
  personalizationEnabled: z.boolean().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

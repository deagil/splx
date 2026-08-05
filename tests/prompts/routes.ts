import { generateUUID } from "@/lib/utils";

export const TEST_PROMPTS = {
  GRASS: {
    MESSAGE: {
      content: "Why is grass green?",
      createdAt: new Date().toISOString(),
      id: generateUUID(),
      parts: [{ text: "Why is grass green?", type: "text" }],
      role: "user",
    },
    OUTPUT_STREAM: [
      'data: {"type":"start-step"}',
      'data: {"type":"text-start","id":"STATIC_ID"}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"It\'s "}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"just "}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"green "}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"duh! "}',
      'data: {"type":"text-end","id":"STATIC_ID"}',
      'data: {"type":"finish-step"}',
      'data: {"type":"finish"}',
      "data: [DONE]",
    ],
  },
  SKY: {
    MESSAGE: {
      content: "Why is the sky blue?",
      createdAt: new Date().toISOString(),
      id: generateUUID(),
      parts: [{ text: "Why is the sky blue?", type: "text" }],
      role: "user",
    },
    OUTPUT_STREAM: [
      'data: {"type":"start-step"}',
      'data: {"type":"text-start","id":"STATIC_ID"}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"It\'s "}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"just "}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"blue "}',
      'data: {"type":"text-delta","id":"STATIC_ID","delta":"duh! "}',
      'data: {"type":"text-end","id":"STATIC_ID"}',
      'data: {"type":"finish-step"}',
      'data: {"type":"finish"}',
      "data: [DONE]",
    ],
  },
};

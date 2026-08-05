import type { ModelMessage } from "ai";

export const TEST_PROMPTS: Record<string, ModelMessage> = {
  CREATE_DOCUMENT_TEXT_CALL: {
    content: [
      {
        text: "Essay about Silicon Valley",
        type: "text",
      },
    ],
    role: "user",
  },
  CREATE_DOCUMENT_TEXT_RESULT: {
    content: [
      {
        output: {
          type: "json",
          value: {
            content: "A document was created and is now visible to the user.",
            id: "3ca386a4-40c6-4630-8ed1-84cbd46cc7eb",
            kind: "text",
            title: "Essay about Silicon Valley",
          },
        },
        toolCallId: "call_123",
        toolName: "createDocument",
        type: "tool-result",
      },
    ],
    role: "tool",
  },
  GET_WEATHER_CALL: {
    content: [
      {
        text: "What's the weather in sf?",
        type: "text",
      },
    ],
    role: "user",
  },
  GET_WEATHER_RESULT: {
    content: [
      {
        output: {
          type: "json",
          value: {
            current: {
              interval: 900,
              temperature_2m: 17,
              time: "2025-03-10T14:00",
            },
            current_units: {
              interval: "seconds",
              temperature_2m: "°C",
              time: "iso8601",
            },
            daily: {
              sunrise: [
                "2025-03-10T07:27",
                "2025-03-11T07:25",
                "2025-03-12T07:24",
                "2025-03-13T07:22",
                "2025-03-14T07:21",
                "2025-03-15T07:19",
                "2025-03-16T07:18",
              ],
              sunset: [
                "2025-03-10T19:12",
                "2025-03-11T19:13",
                "2025-03-12T19:14",
                "2025-03-13T19:15",
                "2025-03-14T19:16",
                "2025-03-15T19:17",
                "2025-03-16T19:17",
              ],
              time: [
                "2025-03-10",
                "2025-03-11",
                "2025-03-12",
                "2025-03-13",
                "2025-03-14",
                "2025-03-15",
                "2025-03-16",
              ],
            },
            daily_units: {
              sunrise: "iso8601",
              sunset: "iso8601",
              time: "iso8601",
            },
            elevation: 18,
            generationtime_ms: 0.064_492_225_646_972_66,
            latitude: 37.763_283,
            longitude: -122.412_86,
            timezone: "America/Los_Angeles",
            timezone_abbreviation: "GMT-7",
            utc_offset_seconds: -25_200,
          },
        },
        toolCallId: "call_456",
        toolName: "getWeather",
        type: "tool-result",
      },
    ],
    role: "tool",
  },
  USER_GRASS: {
    content: [{ text: "Why is grass green?", type: "text" }],
    role: "user",
  },
  USER_IMAGE_ATTACHMENT: {
    content: [
      {
        data: "...",
        mediaType: "...",
        type: "file",
      },
      {
        text: "Who painted this?",
        type: "text",
      },
    ],
    role: "user",
  },
  USER_NEXTJS: {
    content: [
      { text: "What are the advantages of using Next.js?", type: "text" },
    ],
    role: "user",
  },
  USER_SKY: {
    content: [{ text: "Why is the sky blue?", type: "text" }],
    role: "user",
  },
  USER_TEXT_ARTIFACT: {
    content: [
      {
        text: "Help me write an essay about Silicon Valley",
        type: "text",
      },
    ],
    role: "user",
  },
  USER_THANKS: {
    content: [{ text: "Thanks!", type: "text" }],
    role: "user",
  },
};

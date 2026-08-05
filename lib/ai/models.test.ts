import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { getResponseChunksByPrompt } from "@/tests/prompts/utils";

/**
 * AI SDK v7 (LanguageModelV3) result shapes:
 * - `rawCall` and `warnings` are no longer part of the generate/stream result.
 * - Usage is nested: `inputTokens` / `outputTokens` objects rather than flat
 *   `inputTokens` / `outputTokens` / `totalTokens` numbers.
 */
const usage = {
  inputTokens: {
    cacheRead: 0,
    cacheWrite: 0,
    noCache: 10,
    total: 10,
  },
  outputTokens: {
    reasoning: 0,
    text: 20,
    total: 20,
  },
};

export const chatModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ text: "Hello, world!", type: "text" as const }],
    finishReason: { raw: undefined, unified: "stop" as const },
    usage,
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      chunks: getResponseChunksByPrompt(prompt),
      initialDelayInMs: 1000,
    }),
  }),
});

export const reasoningModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ text: "Hello, world!", type: "text" as const }],
    finishReason: { raw: undefined, unified: "stop" as const },
    usage,
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      chunks: getResponseChunksByPrompt(prompt, true),
      initialDelayInMs: 1000,
    }),
  }),
});

export const titleModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ text: "This is a test title", type: "text" as const }],
    finishReason: { raw: undefined, unified: "stop" as const },
    usage,
    warnings: [],
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      chunks: [
        { id: "1", type: "text-start" as const },
        { delta: "This is a test title", id: "1", type: "text-delta" as const },
        { id: "1", type: "text-end" as const },
        {
          finishReason: { raw: undefined, unified: "stop" as const },
          type: "finish" as const,
          usage: {
            inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 3, total: 3 },
            outputTokens: { reasoning: 0, text: 10, total: 10 },
          },
        },
      ],
      initialDelayInMs: 1000,
    }),
  }),
});

export const artifactModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    content: [{ text: "Hello, world!", type: "text" as const }],
    finishReason: { raw: undefined, unified: "stop" as const },
    usage,
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      chunks: getResponseChunksByPrompt(prompt),
      initialDelayInMs: 100,
    }),
  }),
});

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
    total: 10,
    noCache: 10,
    cacheRead: 0,
    cacheWrite: 0,
  },
  outputTokens: {
    total: 20,
    text: 20,
    reasoning: 0,
  },
};

export const chatModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    finishReason: { unified: "stop" as const, raw: undefined },
    usage,
    content: [{ type: "text" as const, text: "Hello, world!" }],
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});

export const reasoningModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    finishReason: { unified: "stop" as const, raw: undefined },
    usage,
    content: [{ type: "text" as const, text: "Hello, world!" }],
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt, true),
    }),
  }),
});

export const titleModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    finishReason: { unified: "stop" as const, raw: undefined },
    usage,
    content: [{ type: "text" as const, text: "This is a test title" }],
    warnings: [],
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: [
        { id: "1", type: "text-start" as const },
        { id: "1", type: "text-delta" as const, delta: "This is a test title" },
        { id: "1", type: "text-end" as const },
        {
          type: "finish" as const,
          finishReason: { unified: "stop" as const, raw: undefined },
          usage: {
            inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 10, text: 10, reasoning: 0 },
          },
        },
      ],
    }),
  }),
});

export const artifactModel = new MockLanguageModelV3({
  doGenerate: async () => ({
    finishReason: { unified: "stop" as const, raw: undefined },
    usage,
    content: [{ type: "text" as const, text: "Hello, world!" }],
    warnings: [],
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});

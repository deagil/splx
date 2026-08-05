import type { LanguageModel } from "ai";

const createMockModel = (): LanguageModel =>
  ({
    defaultObjectGenerationMode: "tool",
    doGenerate: async () => ({
      content: [{ text: "Hello, world!", type: "text" }],
      finishReason: "stop",
      rawCall: { rawPrompt: null, rawSettings: {} },
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      warnings: [],
    }),
    doStream: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            delta: "Mock response",
            id: "mock-id",
            type: "text-delta",
          });
          controller.close();
        },
      }),
    }),
    modelId: "mock-model",
    provider: "mock",
    specificationVersion: "v2",
    supportedUrls: [],
    supportsImageUrls: false,
    supportsStructuredOutputs: false,
  }) as unknown as LanguageModel;

export const chatModel = createMockModel();
export const reasoningModel = createMockModel();
export const titleModel = createMockModel();
export const artifactModel = createMockModel();

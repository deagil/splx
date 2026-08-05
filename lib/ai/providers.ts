import { openai } from "@ai-sdk/openai";
import {
  customProvider,
  type LanguageModelMiddleware,
  wrapLanguageModel,
} from "ai";
import { isProductionEnvironment, isTestEnvironment } from "../constants";

// Optional devtools middleware - only available if package is installed
let devToolsMiddlewareFn: (() => LanguageModelMiddleware) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const devtools = require("@ai-sdk/devtools");
  devToolsMiddlewareFn = devtools.devToolsMiddleware;
} catch {
  // DevTools not available, continue without it
  devToolsMiddlewareFn = undefined;
}

/**
 * OpenAI Provider Configuration
 *
 * All models use gpt-5-mini, which supports:
 * - Image inputs (multimodal vision capabilities)
 * - Tool usage (function calling)
 * - Object generation (structured outputs)
 * - Reasoning capabilities (with reasoning middleware)
 *
 * Provider options can be configured at call time via providerOptions:
 * @see lib/ai/openai-config.ts for helper functions and available options
 *
 * Available provider options include:
 * - reasoningEffort: 'minimal' | 'low' | 'medium' | 'high'
 * - reasoningSummary: 'auto' | 'detailed' (for reasoning models)
 * - textVerbosity: 'low' | 'medium' | 'high'
 * - serviceTier: 'auto' | 'flex' | 'priority' | 'default'
 * - parallelToolCalls: boolean
 * - maxToolCalls: number
 * - And more (see OpenAIResponsesProviderOptions type)
 */
export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "artifact-model": artifactModel,
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // Artifact/document generation model
        "artifact-model": wrapLanguageModel({
          middleware:
            !isProductionEnvironment && devToolsMiddlewareFn
              ? devToolsMiddlewareFn()
              : [],
          model: openai("gpt-5-mini"),
        }),
        // Default chat model with vision and text capabilities
        "chat-model": wrapLanguageModel({
          // Enable DevTools in development for debugging LLM calls
          middleware:
            !isProductionEnvironment && devToolsMiddlewareFn
              ? devToolsMiddlewareFn()
              : [],
          model: openai("gpt-5-mini"),
        }),

        // Reasoning model - uses OpenAI's native reasoning support
        // Reasoning visibility is controlled via providerOptions.reasoningSummary
        // Remove extractReasoningMiddleware as OpenAI handles reasoning natively
        "chat-model-reasoning": wrapLanguageModel({
          middleware:
            !isProductionEnvironment && devToolsMiddlewareFn
              ? devToolsMiddlewareFn()
              : [],
          model: openai("gpt-5-mini"),
        }),

        // Title generation model (optimized for concise output)
        "title-model": wrapLanguageModel({
          middleware:
            !isProductionEnvironment && devToolsMiddlewareFn
              ? devToolsMiddlewareFn()
              : [],
          model: openai("gpt-5-nano"),
        }),
      },
    });

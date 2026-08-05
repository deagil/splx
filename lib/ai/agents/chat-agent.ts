import {
  type InferAgentUIMessage,
  stepCountIs,
  ToolLoopAgent,
  type UIMessageStreamWriter,
} from "ai";
import {
  type RequestHints,
  systemPrompt,
  type UserPreferences,
} from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { navigateToPage } from "@/lib/ai/tools/navigate-to-page";
import { queryUserTable } from "@/lib/ai/tools/query-user-table";
import { readUrlContent } from "@/lib/ai/tools/read-url-content";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchPages } from "@/lib/ai/tools/search-pages";
import { updateDocument } from "@/lib/ai/tools/update-document";
import type { Session } from "@/lib/artifacts/server";
import type { ChatMessage } from "@/lib/types";

export interface ChatAgentOptions {
  dataStream: UIMessageStreamWriter<ChatMessage>;
  requestHints: RequestHints;
  selectedChatModel: string;
  session: Session;
  userPreferences?: UserPreferences;
}

/**
 * Creates a chat agent with all tools configured for the current request.
 *
 * The agent uses ToolLoopAgent from AI SDK v6, which provides:
 * - Reusable agent abstraction
 * - Clean separation of concerns
 * - End-to-end type safety
 *
 * @param options - Configuration options for the agent
 * @returns A configured ToolLoopAgent instance
 */
export const createChatAgent = (options: ChatAgentOptions) => {
  const {
    selectedChatModel,
    requestHints,
    userPreferences,
    session,
    dataStream,
  } = options;

  return new ToolLoopAgent({
    instructions: systemPrompt({
      requestHints,
      selectedChatModel,
      userPreferences,
    }),
    model: myProvider.languageModel(selectedChatModel),
    stopWhen: stepCountIs(5),
    tools: {
      createDocument: createDocument({ dataStream, session }),
      getWeather,
      navigateToPage: navigateToPage({ dataStream }),
      queryUserTable,
      readUrlContent,
      requestSuggestions: requestSuggestions({ dataStream, session }),
      searchPages,
      updateDocument: updateDocument({ dataStream, session }),
    },
  });
};

/**
 * Type-safe UI message type inferred from the chat agent.
 * Use this type in client-side components for full type safety.
 *
 * @example
 * ```tsx
 * import type { ChatAgentUIMessage } from '@/lib/ai/agents/chat-agent';
 *
 * const { messages } = useChat<ChatAgentUIMessage>();
 * ```
 */
export type ChatAgentUIMessage = InferAgentUIMessage<
  ReturnType<typeof createChatAgent>
>;

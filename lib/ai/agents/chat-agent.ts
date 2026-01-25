import {
  InferAgentUIMessage,
  stepCountIs,
  ToolLoopAgent,
  type UIMessageStreamWriter,
} from "ai";
import type { Session } from "@/lib/artifacts/server";
import { myProvider } from "@/lib/ai/providers";
import {
  type RequestHints,
  systemPrompt,
  type UserPreferences,
} from "@/lib/ai/prompts";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { navigateToPage } from "@/lib/ai/tools/navigate-to-page";
import { queryUserTable } from "@/lib/ai/tools/query-user-table";
import { readUrlContent } from "@/lib/ai/tools/read-url-content";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchPages } from "@/lib/ai/tools/search-pages";
import { updateDocument } from "@/lib/ai/tools/update-document";
import type { ChatMessage } from "@/lib/types";

export type ChatAgentOptions = {
  selectedChatModel: string;
  requestHints: RequestHints;
  userPreferences?: UserPreferences;
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

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
    model: myProvider.languageModel(selectedChatModel),
    instructions: systemPrompt({
      selectedChatModel,
      requestHints,
      userPreferences,
    }),
    tools: {
      getWeather,
      createDocument: createDocument({ session, dataStream }),
      updateDocument: updateDocument({ session, dataStream }),
      requestSuggestions: requestSuggestions({ session, dataStream }),
      readUrlContent,
      queryUserTable,
      searchPages,
      navigateToPage: navigateToPage({ dataStream }),
    },
    stopWhen: stepCountIs(5),
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

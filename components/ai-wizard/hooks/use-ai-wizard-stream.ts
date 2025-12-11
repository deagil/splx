"use client";

import { useState, useCallback, useRef } from "react";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type UseAIWizardStreamOptions<TUIState, TPreviewData> = {
  endpoint: string;
  eventType: string;
  getPreviewFromUI?: (ui: TUIState) => TPreviewData | undefined;
  timeout?: number;
};

type UseAIWizardStreamReturn<TUIState, TPreviewData> = {
  start: (description: string, mode?: "auto" | "create" | "refine", previousData?: unknown) => Promise<void>;
  respond: (response: string) => Promise<void>;
  reset: () => void;
  isStreaming: boolean;
  currentUI: TUIState | null;
  previewData: TPreviewData | null;
  error: string | null;
  conversationHistory: ConversationMessage[];
};

export function useAIWizardStream<
  TUIState extends { type: string; message?: string },
  TPreviewData = unknown
>(
  options: UseAIWizardStreamOptions<TUIState, TPreviewData>
): UseAIWizardStreamReturn<TUIState, TPreviewData> {
  const {
    endpoint,
    eventType,
    getPreviewFromUI,
    timeout = 30000,
  } = options;

  const [isStreaming, setIsStreaming] = useState(false);
  const [currentUI, setCurrentUI] = useState<TUIState | null>(null);
  const [previewData, setPreviewData] = useState<TPreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const processStream = useCallback(
    async (
      description: string,
      mode: "auto" | "create" | "refine",
      previousData?: unknown
    ) => {
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
        setError("Request timed out. Please try again.");
        setIsStreaming(false);
      }, timeout);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            mode,
            previous_report: previousData,
            previous_skill: previousData,
            conversation_history: conversationHistory,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          clearTimeout(timeoutId);
          let errorMessage = "Failed to generate";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Use default message
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          clearTimeout(timeoutId);
          throw new Error("No response from server");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let hasReceivedUI = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data: ")) continue;

              try {
                const jsonStr = line.slice(6);
                const data = JSON.parse(jsonStr);

                if (data.type === eventType && data.data) {
                  const uiState = data.data as TUIState;
                  if (uiState && uiState.type) {
                    setCurrentUI(uiState);
                    setIsStreaming(false);
                    hasReceivedUI = true;
                    clearTimeout(timeoutId);

                    // Extract and update preview data
                    if (getPreviewFromUI) {
                      const preview = getPreviewFromUI(uiState);
                      if (preview !== undefined) {
                        setPreviewData(preview);
                      }
                    }
                  }
                }

                if (data.type === "error") {
                  clearTimeout(timeoutId);
                  throw new Error(data.error || "Unknown error occurred");
                }
              } catch (e) {
                if (e instanceof SyntaxError) {
                  continue;
                }
                throw e;
              }
            }
          }

          if (!hasReceivedUI) {
            clearTimeout(timeoutId);
            throw new Error("No UI response received from AI");
          }
        } finally {
          reader.releaseLock();
          clearTimeout(timeoutId);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        setIsStreaming(false);
        if (e instanceof Error && e.name === "AbortError") {
          // Request was aborted, don't set error
          return;
        }
        const errorMessage = e instanceof Error ? e.message : "An error occurred";
        setError(errorMessage);
        throw e;
      }
    },
    [endpoint, eventType, getPreviewFromUI, conversationHistory, timeout]
  );

  const start = useCallback(
    async (
      description: string,
      mode: "auto" | "create" | "refine" = "auto",
      previousData?: unknown
    ) => {
      setIsStreaming(true);
      setCurrentUI(null);
      setError(null);

      // Add user message to history
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: description },
      ]);

      await processStream(description, mode, previousData);
    },
    [processStream]
  );

  const respond = useCallback(
    async (response: string) => {
      if (!currentUI) return;

      setIsStreaming(true);
      setCurrentUI(null);
      setError(null);

      // Add assistant and user messages to history
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: currentUI.message || "" },
        { role: "user", content: response },
      ]);

      await processStream(response, "auto", previewData);
    },
    [currentUI, previewData, processStream]
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setCurrentUI(null);
    setPreviewData(null);
    setError(null);
    setConversationHistory([]);
  }, []);

  return {
    start,
    respond,
    reset,
    isStreaming,
    currentUI,
    previewData,
    error,
    conversationHistory,
  };
}

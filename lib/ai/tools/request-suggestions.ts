import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/artifacts/server";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { myProvider } from "../providers";

interface RequestSuggestionsProps {
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
}

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: "Request suggestions for a document",
    execute: async ({ documentId }) => {
      const document = await getDocumentById({ id: documentId });

      if (!document?.content) {
        return {
          error: "Document not found",
        };
      }

      const suggestions: Omit<
        Suggestion,
        "user_id" | "created_at" | "document_created_at"
      >[] = [];

      const { elementStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        output: "array",
        prompt: document.content,
        schema: z.object({
          description: z.string().describe("The description of the suggestion"),
          originalSentence: z.string().describe("The original sentence"),
          suggestedSentence: z.string().describe("The suggested sentence"),
        }),
        system:
          "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
      });

      for await (const element of elementStream) {
        // @ts-expect-error todo: fix type
        const suggestion: Suggestion = {
          description: element.description,
          document_id: documentId,
          id: generateUUID(),
          is_resolved: false,
          original_text: element.originalSentence,
          suggested_text: element.suggestedSentence,
        };

        dataStream.write({
          data: suggestion,
          transient: true,
          type: "data-suggestion",
        });

        suggestions.push(suggestion);
      }

      if (session.user?.id) {
        const userId = session.user.id;

        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            created_at: new Date(),
            document_created_at: document.created_at,
            user_id: userId,
          })),
        });
      }

      return {
        id: documentId,
        kind: document.kind,
        message: "Suggestions have been added to the document",
        title: document.title,
      };
    },
    inputSchema: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to request edits"),
    }),
  });

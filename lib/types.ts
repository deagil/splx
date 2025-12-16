import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { navigateToPage } from "./ai/tools/navigate-to-page";
import type { queryUserTable } from "./ai/tools/query-user-table";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { searchPages } from "./ai/tools/search-pages";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";
import type { MentionPart } from "./types/mentions";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type queryUserTableTool = InferUITool<typeof queryUserTable>;
type searchPagesTool = InferUITool<typeof searchPages>;
type navigateToPageTool = InferUITool<ReturnType<typeof navigateToPage>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  queryUserTable: queryUserTableTool;
  searchPages: searchPagesTool;
  navigateToPage: navigateToPageTool;
};

export type NavigationData = {
  url: string;
  pageId: string;
  pageName: string;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
  mention: MentionPart;
  navigate: NavigationData;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

export type UserType = "guest" | "regular";

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  type: UserType;
}

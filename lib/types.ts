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
import type { MentionPart } from "./types/mentions";
import type { AppUsage } from "./usage";

export interface DataPart {
  message: string;
  type: "append-message";
}

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

// Must stay a type alias, not an interface: this is passed as a generic
// argument to UIMessage<_, _, ChatTools>, whose constraint requires an implicit
// index signature. Type aliases get one; interfaces do not.
// biome-ignore lint/style/useConsistentTypeDefinitions: needs implicit index signature
export type ChatTools = {
  createDocument: createDocumentTool;
  getWeather: weatherTool;
  navigateToPage: navigateToPageTool;
  queryUserTable: queryUserTableTool;
  requestSuggestions: requestSuggestionsTool;
  searchPages: searchPagesTool;
  updateDocument: updateDocumentTool;
};

export interface NavigationData {
  pageId: string;
  pageName: string;
  url: string;
}

// Must stay a type alias, not an interface — see ChatTools above.
// biome-ignore lint/style/useConsistentTypeDefinitions: needs implicit index signature
export type CustomUIDataTypes = {
  appendMessage: string;
  clear: null;
  codeDelta: string;
  finish: null;
  id: string;
  imageDelta: string;
  kind: ArtifactKind;
  mention: MentionPart;
  navigate: NavigationData;
  sheetDelta: string;
  suggestion: Suggestion;
  textDelta: string;
  title: string;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  contentType: string;
  name: string;
  url: string;
}

export type UserType = "guest" | "regular";

export interface User {
  email: string | null;
  id: string;
  name: string | null;
  type: UserType;
}

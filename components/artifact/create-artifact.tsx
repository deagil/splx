import type { UseChatHelpers } from "@ai-sdk/react";
import type { DataUIPart } from "ai";
import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import type { Suggestion } from "@/lib/db/schema";
import type { ChatMessage, CustomUIDataTypes } from "@/lib/types";
import type { UIArtifact } from "./artifact";

export interface ArtifactActionContext<M = any> {
  content: string;
  currentVersionIndex: number;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  isCurrentVersion: boolean;
  metadata: M;
  mode: "edit" | "diff";
  setMetadata: Dispatch<SetStateAction<M>>;
}

interface ArtifactAction<M = any> {
  description: string;
  icon: ReactNode;
  isDisabled?: (context: ArtifactActionContext<M>) => boolean;
  label?: string;
  onClick: (context: ArtifactActionContext<M>) => Promise<void> | void;
}

export interface ArtifactToolbarContext {
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
}

export interface ArtifactToolbarItem {
  description: string;
  icon: ReactNode;
  onClick: (context: ArtifactToolbarContext) => void;
}

interface ArtifactContent<M = any> {
  content: string;
  currentVersionIndex: number;
  getDocumentContentById: (index: number) => string;
  isCurrentVersion: boolean;
  isInline: boolean;
  isLoading: boolean;
  metadata: M;
  mode: "edit" | "diff";
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  setMetadata: Dispatch<SetStateAction<M>>;
  status: "streaming" | "idle";
  suggestions: Suggestion[];
  title: string;
}

interface InitializeParameters<M = any> {
  documentId: string;
  setMetadata: Dispatch<SetStateAction<M>>;
}

interface ArtifactConfig<T extends string, M = any> {
  actions: ArtifactAction<M>[];
  content: ComponentType<ArtifactContent<M>>;
  description: string;
  initialize?: (parameters: InitializeParameters<M>) => void;
  kind: T;
  onStreamPart: (args: {
    setMetadata: Dispatch<SetStateAction<M>>;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    streamPart: DataUIPart<CustomUIDataTypes>;
  }) => void;
  toolbar: ArtifactToolbarItem[];
}

export class Artifact<T extends string, M = any> {
  readonly kind: T;
  readonly description: string;
  readonly content: ComponentType<ArtifactContent<M>>;
  readonly actions: ArtifactAction<M>[];
  readonly toolbar: ArtifactToolbarItem[];
  readonly initialize?: (parameters: InitializeParameters) => void;
  readonly onStreamPart: (args: {
    setMetadata: Dispatch<SetStateAction<M>>;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    streamPart: DataUIPart<CustomUIDataTypes>;
  }) => void;

  constructor(config: ArtifactConfig<T, M>) {
    this.kind = config.kind;
    this.description = config.description;
    this.content = config.content;
    this.actions = config.actions || [];
    this.toolbar = config.toolbar || [];
    this.initialize = config.initialize || (async () => ({}));
    this.onStreamPart = config.onStreamPart;
  }
}

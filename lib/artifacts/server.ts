import type { UIMessageStreamWriter } from "ai";
export interface Session {
  user?: {
    id?: string | null;
  } | null;
}

import { codeDocumentHandler } from "@/artifacts/code/server";
import { sheetDocumentHandler } from "@/artifacts/sheet/server";
import { textDocumentHandler } from "@/artifacts/text/server";
import type { ArtifactKind } from "@/components/artifact/artifact";
import { saveDocument } from "../db/queries";
import type { Document } from "../db/schema";
import type { ChatMessage } from "../types";

export interface SaveDocumentProps {
  content: string;
  id: string;
  kind: ArtifactKind;
  title: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  dataStream: UIMessageStreamWriter<ChatMessage>;
  id: string;
  session: Session;
  title: string;
}

export interface UpdateDocumentCallbackProps {
  dataStream: UIMessageStreamWriter<ChatMessage>;
  description: string;
  document: Document;
  session: Session;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        dataStream: args.dataStream,
        id: args.id,
        session: args.session,
        title: args.title,
      });

      if (args.session?.user?.id) {
        await saveDocument({
          content: draftContent,
          id: args.id,
          kind: config.kind,
          title: args.title,
          userId: args.session.user.id,
        });
      }
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        dataStream: args.dataStream,
        description: args.description,
        document: args.document,
        session: args.session,
      });

      if (args.session?.user?.id) {
        await saveDocument({
          content: draftContent,
          id: args.document.id,
          kind: config.kind,
          title: args.document.title,
          userId: args.session.user.id,
        });
      }
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
  sheetDocumentHandler,
];

export const artifactKinds = ["text", "code", "sheet"] as const;

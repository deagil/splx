"use client";

import { useMemo } from "react";
import type { PageRecord } from "@/lib/server/pages";
import {
  ListBlockView,
  RecordBlockView,
  ReportBlockView,
  TriggerBlockView,
} from "./blocks";
import { MentionContextProvider } from "./mention-context";
import { pageRecordToDraft } from "./transformers";
import type { PageBlockDraft } from "./types";
import { ViewBlock } from "./view-block";

export interface PageViewerProps {
  page: PageRecord;
  urlParams: Record<string, string>;
}

export function PageViewer({ page, urlParams }: PageViewerProps) {
  const draft = useMemo(() => pageRecordToDraft(page), [page]);

  if (draft.blocks.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 border-dashed p-8 text-center text-muted-foreground text-sm">
        This page does not have any blocks yet. Switch to edit mode to configure
        the layout.
      </div>
    );
  }

  return (
    <MentionContextProvider page={page}>
      <div
        className="grid grid-cols-12 gap-4"
        style={{
          gridAutoFlow: "row dense",
          gridAutoRows: "minmax(110px, auto)",
        }}
      >
        {draft.blocks.map((block) => (
          <ViewBlock
            id={block.id}
            key={block.id}
            position={block.position}
            type={block.type}
          >
            {renderBlock(block, urlParams)}
          </ViewBlock>
        ))}
      </div>
    </MentionContextProvider>
  );
}

function renderBlock(block: PageBlockDraft, urlParams: Record<string, string>) {
  switch (block.type) {
    case "list":
      return <ListBlockView block={block} urlParams={urlParams} />;
    case "record":
      return <RecordBlockView block={block} urlParams={urlParams} />;
    case "report":
      return <ReportBlockView block={block} />;
    case "trigger":
      return <TriggerBlockView block={block} />;
    default: {
      // TypeScript exhaustiveness check narrows to 'never', but we need to handle runtime cases
      const blockType = (block as { type: string }).type;
      return (
        <div className="p-4 text-muted-foreground text-sm">
          Unsupported block type: {String(blockType)}
        </div>
      );
    }
  }
}

"use client";

/**
 * The editable email. A controlled component over `{ blocks, selectedBlockId }`
 * — it owns no state, so selecting a block here and selecting it in the left
 * list are the same operation.
 *
 * `emailBodyStyle` and `emailContainerStyle` are applied to the card itself, so
 * the blocks inherit the email's font stack rather than the app's. All editing
 * chrome lives inside `CanvasBlock`, positioned absolutely outside that flow.
 */

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo } from "react";
import { emailBodyStyle, emailContainerStyle } from "@/lib/comms/block-styles";
import type {
  EmailBlock,
  EmailBlockType,
  EmailTemplateVariable,
} from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import { BlockContent } from "./block-content";
import { CanvasBlock } from "./canvas-block";
import { InsertDivider } from "./insert-divider";
import { namespacedId } from "./use-block-sortable";

export interface EmailCanvasProps {
  blocks: EmailBlock[];
  className?: string;
  /** `mobile` narrows the card to the usual 375px viewport width. */
  device?: "desktop" | "mobile";
  /** Read-only merged render; the canvas becomes a preview. */
  mode?: "edit" | "preview";
  onChangeBlock: (id: string, patch: Partial<EmailBlock>) => void;
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onInsertBlock: (type: EmailBlockType, index: number) => void;
  onMoveBlock: (from: number, to: number) => void;
  onSelectBlock: (id: string | null) => void;
  selectedBlockId: string | null;
  /** Merge values for `mode="preview"`. */
  values?: Record<string, unknown>;
  variables: EmailTemplateVariable[];
}

export function EmailCanvas({
  blocks,
  className,
  device = "desktop",
  mode = "edit",
  onChangeBlock,
  onCreateVariable,
  onDeleteBlock,
  onDuplicateBlock,
  onInsertBlock,
  onMoveBlock,
  onSelectBlock,
  selectedBlockId,
  values = {},
  variables,
}: EmailCanvasProps) {
  const sortableIds = useMemo(
    () => blocks.map((block) => namespacedId("canvas", block.id)),
    [blocks]
  );

  const card = (
    <div
      style={{
        ...emailContainerStyle,
        maxWidth: device === "mobile" ? "375px" : emailContainerStyle.maxWidth,
      }}
    >
      {mode === "preview" ? (
        blocks.map((block) => (
          <BlockContent
            block={block}
            key={block.id}
            mode="preview"
            values={values}
          />
        ))
      ) : (
        <>
          <InsertDivider index={0} onInsert={onInsertBlock} />
          {blocks.map((block, index) => (
            <div key={block.id}>
              <CanvasBlock
                block={block}
                canMoveDown={index < blocks.length - 1}
                canMoveUp={index > 0}
                onChange={(patch) => onChangeBlock(block.id, patch)}
                onCreateVariable={onCreateVariable}
                onDelete={() => onDeleteBlock(block.id)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onMoveDown={() => onMoveBlock(index, index + 1)}
                onMoveUp={() => onMoveBlock(index, index - 1)}
                onSelect={() => onSelectBlock(block.id)}
                selected={selectedBlockId === block.id}
                variables={variables}
              />
              <InsertDivider index={index + 1} onInsert={onInsertBlock} />
            </div>
          ))}
          {blocks.length === 0 ? (
            <p
              style={{
                color: "#9ca3af",
                fontSize: "14px",
                padding: "32px 0",
                textAlign: "center",
              }}
            >
              This email is empty — use ＋ above to add a block.
            </p>
          ) : null}
        </>
      )}
    </div>
  );

  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      // Clicking the backdrop clears selection, the same as a canvas app.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onSelectBlock(null);
        }
      }}
      style={emailBodyStyle}
    >
      {/* Generous top padding so a block's hover toolbar, which sits above it,
          is never clipped by the scroll container. Horizontal padding leaves
          room for the drag handles hanging off the left edge. */}
      <div className="px-12 pt-14 pb-24">
        {mode === "preview" ? (
          card
        ) : (
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {card}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

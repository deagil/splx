"use client";

/**
 * One block on the canvas: the email content plus all its editing chrome.
 *
 * Every affordance here is absolutely positioned and uses `ring`/`outline`
 * rather than `border` or `padding`, so nothing in this file can shift the
 * email's box metrics by a pixel. Hover state is pure CSS (`group/block`) —
 * lifting it into React would re-render the editor at pointer speed.
 */

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  GripVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { EmailBlock, EmailTemplateVariable } from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import { BlockContent } from "./block-content";
import { BLOCK_META, isTextBlock } from "./block-meta";
import { namespacedId, useBlockSortable } from "./use-block-sortable";

export interface CanvasBlockProps {
  block: EmailBlock;
  canMoveDown: boolean;
  canMoveUp: boolean;
  onChange: (patch: Partial<EmailBlock>) => void;
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onSelect: () => void;
  selected: boolean;
  variables: EmailTemplateVariable[];
}

export function CanvasBlock({
  block,
  canMoveDown,
  canMoveUp,
  onChange,
  onCreateVariable,
  onDelete,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onSelect,
  selected,
  variables,
}: CanvasBlockProps) {
  const sortable = useBlockSortable(namespacedId("canvas", block.id));
  const meta = BLOCK_META[block.type];
  // Text blocks focus their TokenField; making the wrapper focusable too would
  // put a second, competing tab stop in front of the editable text.
  const focusable = !isTextBlock(block);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!focusable || event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onDelete();
    }
  };

  return (
    <div
      className={cn(
        "group/block relative",
        sortable.isDragging && "opacity-40"
      )}
      data-block-id={block.id}
      data-selected={selected || undefined}
      onFocus={onSelect}
      onKeyDown={handleKeyDown}
      // mouseDown, not click: with a TokenField inside, click fires after the
      // browser has already moved the caret, so selecting on click can lose the
      // click position if anything repaints.
      onMouseDown={onSelect}
      ref={sortable.ref}
      style={sortable.style}
      tabIndex={focusable ? 0 : undefined}
    >
      {/* Selection ring — outside the flow, so it cannot affect layout. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-[-6px] inset-y-[-2px] rounded-[5px] ring-1 ring-transparent transition-[box-shadow] duration-150",
          "group-hover/block:ring-border",
          "group-focus-within/block:ring-2 group-focus-within/block:ring-ring/40",
          selected && "ring-2 ring-ring/50 group-hover/block:ring-ring/50"
        )}
      />

      {/* Drag handle sits outside the 560px column so it never overlaps copy. */}
      <button
        aria-label={`Reorder ${meta.label} block`}
        className={cn(
          "absolute top-0 -left-9 flex size-6 cursor-grab items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150",
          "hover:bg-accent hover:text-foreground focus-visible:opacity-100 active:cursor-grabbing group-hover/block:opacity-100",
          selected && "opacity-100"
        )}
        ref={sortable.handleRef}
        type="button"
        {...sortable.handleProps}
      >
        <GripVerticalIcon className="size-3.5" />
      </button>

      <div
        className={cn(
          "absolute -top-3 right-0 z-10 flex -translate-y-full items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 opacity-0 shadow-sm transition-opacity duration-150",
          "focus-within:opacity-100 group-hover/block:opacity-100",
          selected && "opacity-100"
        )}
      >
        <span className="px-1.5 font-medium text-muted-foreground text-xs">
          {meta.label}
        </span>
        <ToolbarButton disabled={!canMoveUp} label="Move up" onClick={onMoveUp}>
          <ArrowUpIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          disabled={!canMoveDown}
          label="Move down"
          onClick={onMoveDown}
        >
          <ArrowDownIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Duplicate" onClick={onDuplicate}>
          <CopyIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton destructive label="Delete" onClick={onDelete}>
          <Trash2Icon className="size-3.5" />
        </ToolbarButton>
      </div>

      <BlockContent
        block={block}
        mode="editable"
        onChange={onChange}
        onCreateVariable={onCreateVariable}
        variables={variables}
      />
    </div>
  );
}

function ToolbarButton({
  children,
  destructive,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex size-6 items-center justify-center rounded transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        destructive && "hover:bg-destructive/10 hover:text-destructive"
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      // Keep focus (and the caret) where it was when using the toolbar.
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

"use client";

/**
 * "Content" tab: the block list, and the properties of the selected block that
 * are *not* editable directly on the canvas (URLs, heading level, image width,
 * spacer height). Anything the author can just type on the email itself
 * deliberately has no duplicate field here.
 */

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  EMAIL_BLOCK_TYPES,
  type EmailBlock,
  type EmailBlockType,
  type EmailTemplateVariable,
} from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import { BLOCK_META, describeBlock } from "../canvas/block-meta";
import { namespacedId, useBlockSortable } from "../canvas/use-block-sortable";
import { TokenField } from "../token-field/token-field";

export interface ContentPanelProps {
  blocks: EmailBlock[];
  onChangeBlock: (id: string, patch: Partial<EmailBlock>) => void;
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  onDeleteBlock: (id: string) => void;
  onInsertBlock: (type: EmailBlockType, index: number) => void;
  onSelectBlock: (id: string | null) => void;
  selectedBlockId: string | null;
  variables: EmailTemplateVariable[];
}

export function ContentPanel({
  blocks,
  onChangeBlock,
  onCreateVariable,
  onDeleteBlock,
  onInsertBlock,
  onSelectBlock,
  selectedBlockId,
  variables,
}: ContentPanelProps) {
  const sortableIds = useMemo(
    () => blocks.map((block) => namespacedId("list", block.id)),
    [blocks]
  );
  const selected = blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="font-medium text-sm">Blocks</h2>
        <Popover>
          <PopoverTrigger
            className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground"
            type="button"
          >
            <PlusIcon className="size-3.5" />
            Add
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 p-1" side="bottom">
            {EMAIL_BLOCK_TYPES.map((type) => {
              const meta = BLOCK_META[type];
              const Icon = meta.icon;
              return (
                <button
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  key={type}
                  onClick={() => onInsertBlock(type, blocks.length)}
                  type="button"
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{meta.label}</span>
                    <span className="block truncate text-muted-foreground text-xs">
                      {meta.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-0.5">
            {blocks.map((block) => (
              <BlockRow
                block={block}
                key={block.id}
                onDelete={() => onDeleteBlock(block.id)}
                onSelect={() => onSelectBlock(block.id)}
                selected={selectedBlockId === block.id}
              />
            ))}
          </ul>
        </SortableContext>
        {blocks.length === 0 ? (
          <p className="px-2 py-6 text-center text-muted-foreground text-sm">
            No blocks yet.
          </p>
        ) : null}
      </div>

      {selected ? (
        <div className="max-h-[45%] shrink-0 overflow-y-auto border-border border-t bg-muted/30 px-4 py-3">
          <BlockProperties
            block={selected}
            onChange={(patch) => onChangeBlock(selected.id, patch)}
            onCreateVariable={onCreateVariable}
            variables={variables}
          />
        </div>
      ) : null}
    </div>
  );
}

function BlockRow({
  block,
  onDelete,
  onSelect,
  selected,
}: {
  block: EmailBlock;
  onDelete: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  const sortable = useBlockSortable(namespacedId("list", block.id));
  const meta = BLOCK_META[block.type];
  const Icon = meta.icon;

  return (
    <li
      className={cn(
        "group/row flex items-center gap-1 rounded-md pr-1 transition-colors",
        selected ? "bg-accent" : "hover:bg-muted",
        sortable.isDragging && "opacity-40"
      )}
      ref={sortable.ref}
      style={sortable.style}
    >
      <button
        aria-label={`Reorder ${meta.label}`}
        className="flex size-6 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 active:cursor-grabbing group-hover/row:opacity-100"
        ref={sortable.handleRef}
        type="button"
        {...sortable.handleProps}
      >
        <GripVerticalIcon className="size-3.5" />
      </button>
      <button
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
        onClick={onSelect}
        type="button"
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{meta.label}</span>
          <span className="block truncate text-muted-foreground text-xs">
            {describeBlock(block)}
          </span>
        </span>
      </button>
      <button
        aria-label={`Delete ${meta.label}`}
        className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/row:opacity-100"
        onClick={onDelete}
        type="button"
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </li>
  );
}

const HEADING_LEVELS = [1, 2, 3] as const;

function BlockProperties({
  block,
  onChange,
  onCreateVariable,
  variables,
}: {
  block: EmailBlock;
  onChange: (patch: Partial<EmailBlock>) => void;
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  variables: EmailTemplateVariable[];
}) {
  const meta = BLOCK_META[block.type];

  return (
    <div className="space-y-3">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {meta.label} settings
      </p>

      {block.type === "heading" ? (
        <div className="space-y-1.5">
          <Label>Size</Label>
          <div className="flex gap-1">
            {HEADING_LEVELS.map((level) => (
              <button
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-sm transition-colors",
                  (block.level ?? 1) === level
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-accent"
                )}
                key={level}
                onClick={() => onChange({ level })}
                type="button"
              >
                H{level}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {block.type === "button" ? (
        <div className="space-y-1.5">
          <Label>Link URL</Label>
          <TokenField
            aria-label="Button URL"
            onChange={(next) => onChange({ url: next })}
            onCreateVariable={onCreateVariable}
            placeholder="https://example.com"
            value={block.url}
            variables={variables}
          />
        </div>
      ) : null}

      {block.type === "header" ? (
        <div className="space-y-1.5">
          <Label>Logo URL</Label>
          <TokenField
            aria-label="Logo URL"
            onChange={(next) => onChange({ logoUrl: next })}
            onCreateVariable={onCreateVariable}
            placeholder="https://cdn.example.com/logo.png"
            value={block.logoUrl ?? ""}
            variables={variables}
          />
        </div>
      ) : null}

      {block.type === "image" ? (
        <>
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <TokenField
              aria-label="Image URL"
              onChange={(next) => onChange({ src: next })}
              onCreateVariable={onCreateVariable}
              placeholder="https://cdn.example.com/hero.png"
              value={block.src}
              variables={variables}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image-alt">Alt text</Label>
            <Input
              id="image-alt"
              onChange={(event) => onChange({ alt: event.target.value })}
              placeholder="Describe the image"
              value={block.alt ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image-width">Width (px)</Label>
            <Input
              id="image-width"
              onChange={(event) =>
                onChange({
                  width: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              placeholder="Full width"
              type="number"
              value={block.width ?? ""}
            />
          </div>
        </>
      ) : null}

      {block.type === "spacer" ? (
        <div className="space-y-1.5">
          <Label htmlFor="spacer-height">Height (px)</Label>
          <Input
            id="spacer-height"
            onChange={(event) =>
              onChange({ height: Number(event.target.value) || 16 })
            }
            type="number"
            value={block.height ?? 16}
          />
        </div>
      ) : null}

      {block.type === "divider" ||
      block.type === "text" ||
      block.type === "footer" ? (
        <p className="text-muted-foreground text-xs">
          {block.type === "divider"
            ? "A divider has no settings."
            : "Edit this text directly on the email."}
        </p>
      ) : null}

      <Button
        className="w-full"
        onClick={() => {
          // Focus the canvas copy of this block so the caret lands in the email.
          const node = document.querySelector<HTMLElement>(
            `[data-block-id="${block.id}"] [contenteditable]`
          );
          node?.focus();
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        Edit text on the email
      </Button>
    </div>
  );
}

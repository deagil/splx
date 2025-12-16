"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ExpandIcon, PanelsTopLeftIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PageBlockDraft, PageDraft, RecordBlockDraft, ListBlockDraft, ReportBlockDraft, TriggerBlockDraft } from "./types";
import { LIST_DISPLAY_FORMATS, RECORD_DISPLAY_MODES, REPORT_CHART_TYPES } from "./types";
import { ViewBlock } from "./view-block";
import { ListBlockView, RecordBlockView, ReportBlockView, TriggerBlockView } from "./blocks";
import {
  CheckboxField,
  Field,
  ListBlockForm,
  RecordBlockForm,
  ReportBlockForm,
  TriggerBlockForm,
} from "./block-forms";
import { useTableMetadata, useReports } from "./hooks";
import { reorderBlocks } from "./layout-engine";
import { motion, AnimatePresence } from "framer-motion";

const GRID_COLUMNS = 12;
const GRID_ROW_HEIGHT = 110;
const MIN_WIDTH = 2;
const MIN_HEIGHT = 2;

export type PageGridEditorProps = {
  draft: PageDraft;
  urlParams: Record<string, string>;
  onDraftChange: (next: PageDraft) => void;
};

export function PageGridEditor({ draft, urlParams, onDraftChange }: PageGridEditorProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);
  const [dataTables, setDataTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const { reports, isLoading: reportsLoading } = useReports();
  
  // DRAG STATE (Lifted from EditableBlock)
  const dragState = useRef<{
    type: "drag" | "resize";
    blockId: string;
    startX: number;
    startY: number;
    startPos: PageBlockDraft["position"];
    startRect?: DOMRect;
    // Store latest calculations here for synchronous access in event listeners
    latestLayout?: PageBlockDraft[];
    latestValid?: boolean;
  } | null>(null);

  const [dragPreview, setDragPreview] = useState<{
    blockId: string;
    deltaX: number;
    deltaY: number;
    // The "live" layout including pushed blocks
    layoutBlocks: PageBlockDraft[];
    isValid: boolean;
    error: string | null;
  } | null>(null);

  const gridBackgroundStyle = useMemo(
    () => ({
      backgroundImage:
        "linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.14) 1px, transparent 1px)",
      backgroundSize: "calc(100% / 12) 100%, 100% 110px",
    }),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadTables = async () => {
      setTablesLoading(true);
      try {
        const response = await fetch("/api/tables?type=data", { signal: controller.signal });
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        const tables = Array.isArray(payload) ? payload : payload?.tables;
        if (Array.isArray(tables)) {
          const names = tables
            .map((table) => (typeof table === "string" ? table : table?.name))
            .filter((name): name is string => Boolean(name));
          setDataTables(names);
        }
      } catch {
        // ignore
      } finally {
        setTablesLoading(false);
      }
    };
    void loadTables();
    return () => controller.abort();
  }, []);

  const handlePositionChange = (id: string, position: PageBlockDraft["position"]) => {
    onDraftChange({
      ...draft,
      blocks: draft.blocks.map((block) =>
        block.id === id
          ? {
              ...block,
              position,
            }
          : block,
      ),
    });
  };

  const handleBlockChange = (id: string, updated: PageBlockDraft) => {
    onDraftChange({
      ...draft,
      blocks: draft.blocks.map((block) => (block.id === id ? updated : block)),
    });
  };

  const handleRemoveBlock = (id: string) => {
    onDraftChange({
      ...draft,
      blocks: draft.blocks.filter((block) => block.id !== id),
    });
    if (activeSettingsId === id) {
      setActiveSettingsId(null);
    }
  };

  // ----- GLOBAL DRAG HANDLERS -----

  const handlePointerUp = () => {
    const current = dragState.current;
    if (current?.type === "drag") {
      // Check validation and commit if valid
      if (current.latestValid && current.latestLayout) {
         onDraftChange({
            ...draft,
            blocks: current.latestLayout,
         });
      }
    }
    
    dragState.current = null;
    setDragPreview(null);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const current = dragState.current;
    if (!current || !gridRef.current) {
      return;
    }

    event.preventDefault();
    const rect = gridRef.current.getBoundingClientRect();
    const colWidth = rect.width / GRID_COLUMNS;
    
    // Pixel deltas
    const rawDeltaX = event.clientX - current.startX;
    const rawDeltaY = event.clientY - current.startY;

    // Grid deltas
    const colDelta = Math.round(rawDeltaX / colWidth);
    const rowDelta = Math.round(rawDeltaY / GRID_ROW_HEIGHT);

    if (current.type === "drag") {
      const nextX = clamp(current.startPos.x + colDelta, 0, GRID_COLUMNS - current.startPos.width);
      const nextY = Math.max(0, current.startPos.y + rowDelta);
      
      const targetPos = {
        ...current.startPos,
        x: nextX,
        y: nextY,
      };

      // Run collision engine to get new layout
      // Note: We pass original 'draft.blocks' as base, but we should probably start from current state?
      // reorderBlocks is pure.
      const newLayout = reorderBlocks(draft.blocks, current.blockId, targetPos);

      // VALIDATION: Check for out-of-bounds
      const colRaw = Math.round((current.startPos.x * colWidth + rawDeltaX) / colWidth);
      const isOutOfBounds = colRaw < 0 || colRaw + current.startPos.width > GRID_COLUMNS;
      
      const isValid = !isOutOfBounds;
      const error = isOutOfBounds ? "Cannot place here: Out of bounds" : null;

      // console.log(`[Drag] Delta: (${rawDeltaX}, ${rawDeltaY}) | Grid: (${colDelta}, ${rowDelta}) | Valid: ${isValid}`);
      
      // Update Ref for synchronous access in pointerUp
      current.latestLayout = newLayout;
      current.latestValid = isValid;

      setDragPreview({
        blockId: current.blockId,
        deltaX: rawDeltaX,
        deltaY: rawDeltaY,
        layoutBlocks: newLayout,
        isValid,
        error
      });
      return;
    }

    // RESIZE (Direct update - stays simple/snappy for now as discussed)
    const maxWidth = GRID_COLUMNS - current.startPos.x;
    const nextWidth = clamp(current.startPos.width + colDelta, MIN_WIDTH, maxWidth);
    const nextHeight = Math.max(MIN_HEIGHT, current.startPos.height + rowDelta);
    handlePositionChange(current.blockId, {
      ...current.startPos,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const startDrag = (event: ReactPointerEvent, blockId: string, position: PageBlockDraft["position"], type: "drag" | "resize") => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    // Attempt to find the main block element. ViewBlock renders a section.
    const blockElement = target.closest('section') || target.parentElement?.parentElement; 
    const startRect = blockElement?.getBoundingClientRect();

    dragState.current = {
      type,
      blockId,
      startX: event.clientX,
      startY: event.clientY,
      startPos: position,
      startRect: startRect || undefined,
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    
    // Initial preview state if dragging
    if (type === "drag") {
       setDragPreview({
          blockId,
          deltaX: 0,
          deltaY: 0,
          layoutBlocks: draft.blocks,
          isValid: true,
          error: null,
       });
    }
  };

  // Determine which blocks to render: the preview layout (during drag) or the real draft
  const blocksToRender = dragPreview ? dragPreview.layoutBlocks : draft.blocks;

  return (
    <>
      <TooltipProvider delayDuration={80}>
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 rounded-2xl border border-border/70 bg-muted/40"
            style={gridBackgroundStyle}
          />
          <div
            ref={gridRef}
            className="relative z-10 grid grid-cols-12 gap-4 p-2 md:p-3"
            style={{ gridAutoRows: `${GRID_ROW_HEIGHT}px` }}
          >
            {/* Instead of complex positioning, let's use the layoutBlocks loop for the 'Hole' and specific render for Ghost. */}
            <AnimatePresence>
            {blocksToRender.map((block) => {
              const isDragging = dragPreview?.blockId === block.id;
              
              return (
                <EditableBlock
                  key={block.id}
                  block={block}
                  gridRef={gridRef}
                  urlParams={urlParams}
                  dataTables={dataTables}
                  tablesLoading={tablesLoading}
                  reports={reports}
                  onToggleSettings={() =>
                    setActiveSettingsId((current) => (current === block.id ? null : block.id))
                  }
                  isSettingsOpen={activeSettingsId === block.id}
                  onRemove={() => {
                    handleRemoveBlock(block.id);
                    setActiveSettingsId((current) => (current === block.id ? null : current));
                  }}
                  onBlockChange={(next) => handleBlockChange(block.id, next)}
                  onStartDrag={(e, type) => startDrag(e, block.id, block.position, type)}
                  isDragging={isDragging}
                >
                  {renderBlock(block, urlParams)}
                </EditableBlock>
            )})}
            </AnimatePresence>
            
            {/* FLOATING GHOST - Rendered OUTSIDE the grid flow */}
            {dragPreview && (
                <FloatingGhost 
                    // We need the original block data
                    block={draft.blocks.find(b => b.id === dragPreview.blockId)!}
                    urlParams={urlParams}
                    startX={dragState.current?.startX || 0}
                    startY={dragState.current?.startY || 0}
                    deltaX={dragPreview.deltaX}
                    deltaY={dragPreview.deltaY}
                    initialRect={dragState.current?.startRect} 
                    isValid={dragPreview.isValid}
                    error={dragPreview.error}
                />
            )}
          </div>
        </div>
      </TooltipProvider>
    </>
  );
}

// Helper component for the floating ghost
function FloatingGhost({ block, urlParams, startX, startY, deltaX, deltaY, initialRect, isValid = true, error }: any) {
    if (!initialRect) return null;
    return (
        <div 
            className="fixed z-50 pointer-events-none shadow-2xl transition-colors duration-200"
            style={{
                left: initialRect.left,
                top: initialRect.top,
                width: initialRect.width,
                height: initialRect.height,
                transform: `translate(${deltaX}px, ${deltaY}px)`,
            }}
        >
             {/* Error Label */}
             {!isValid && error && (
                <div className="absolute -top-8 left-0 flex items-center bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded shadow-sm animate-in fade-in zoom-in slide-in-from-bottom-2">
                   {error}
                </div>
             )}

             <div className={cn(
                "h-full w-full rounded-lg border overflow-hidden",
                isValid 
                  ? "bg-background border-primary/50 opacity-90" 
                  : "bg-red-500/10 border-red-500 border-2 opacity-100"
             )}>
                 {/* We re-render content or just an image? Re-rendering is fine. */}
                 {renderBlock(block, urlParams)}
             </div>
        </div>
    );
}

function EditableBlock({
  block,
  gridRef,
  urlParams,
  dataTables,
  tablesLoading,
  reports,
  onToggleSettings,
  onRemove,
  onBlockChange,
  onStartDrag,
  isSettingsOpen,
  isDragging,
  children,
}: {
  block: PageBlockDraft;
  gridRef: React.RefObject<HTMLDivElement | null>;
  urlParams: Record<string, string>;
  dataTables: string[];
  tablesLoading: boolean;
  reports?: any[];
  onToggleSettings: () => void;
  onRemove: () => void;
  onBlockChange: (block: PageBlockDraft) => void;
  onStartDrag: (event: React.PointerEvent, type: "drag" | "resize") => void;
  isSettingsOpen: boolean;
  isDragging: boolean;
  children: React.ReactNode;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!isSettingsOpen) {
      setShowAdvanced(false);
    }
  }, [isSettingsOpen]);

  const renderAdvancedSettings = () => {
    switch (block.type) {
      case "list":
        return <ListBlockForm block={block as ListBlockDraft} onChange={(next) => onBlockChange(next)} />;
      case "record":
        return (
          <RecordBlockForm
            block={block as RecordBlockDraft}
            onChange={(next) => onBlockChange(next)}
            tableOptions={dataTables}
            tablesLoading={tablesLoading}
          />
        );
      case "report":
        return <ReportBlockForm block={block as ReportBlockDraft} onChange={(next) => onBlockChange(next)} reports={reports} />;
      case "trigger":
        return <TriggerBlockForm block={block as TriggerBlockDraft} onChange={(next) => onBlockChange(next)} />;
      default:
        return null;
    }
  };

  const renderSimpleSettings = () => {
    switch (block.type) {
      case "list": {
        const listBlock = block as ListBlockDraft;
        const update = (updates: Partial<typeof listBlock>) =>
          onBlockChange({
            ...listBlock,
            ...updates,
          });
        const updateDisplay = (updates: Partial<typeof listBlock.display>) =>
          update({
            display: {
              ...listBlock.display,
              ...updates,
            },
          });
        return (
          <div className="space-y-4">
            <Field>
              <Label htmlFor={`quick-list-table-${listBlock.id}`}>Table</Label>
              <Select
                value={listBlock.tableName}
                onValueChange={(value) => update({ tableName: value })}
                disabled={tablesLoading}
              >
                <SelectTrigger id={`quick-list-table-${listBlock.id}`}>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {(dataTables.length ? dataTables : [listBlock.tableName].filter(Boolean)).map((name: string) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor={`quick-list-format-${listBlock.id}`}>Display</Label>
              <FormatToggle
                idPrefix={`quick-list-format-${listBlock.id}`}
                value={listBlock.display.format}
                onChange={(value) => updateDisplay({ format: value })}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <CheckboxField
                id={`quick-list-actions-${listBlock.id}`}
                label="Show row actions"
                checked={listBlock.display.showActions}
                onChange={(checked) => updateDisplay({ showActions: checked })}
              />
              <CheckboxField
                id={`quick-list-search-${listBlock.id}`}
                label="Enable search"
                checked={listBlock.display.enableSearch ?? true}
                onChange={(checked) => updateDisplay({ enableSearch: checked })}
              />
            </div>
          </div>
        );
      }
      case "record": {
        return (
          <RecordSimpleSettings
            block={block as RecordBlockDraft}
            onChange={(next) => onBlockChange(next)}
            tableOptions={dataTables}
            tablesLoading={tablesLoading}
          />
        );
      }
      case "report": {
        const reportBlock = block as ReportBlockDraft;
        const update = (updates: Partial<typeof reportBlock>) =>
          onBlockChange({
            ...reportBlock,
            ...updates,
          });
        const updateDisplay = (updates: Partial<typeof reportBlock.display>) =>
          update({
            display: {
              ...reportBlock.display,
              ...updates,
            },
          });
        return (
          <div className="space-y-4">
            <Field>
              <Label htmlFor={`quick-report-id-${reportBlock.id}`}>Report</Label>
              <Select
                value={reportBlock.reportId}
                onValueChange={(value) => update({ reportId: value })}
                disabled={!reports?.length}
              >
                <SelectTrigger id={`quick-report-id-${reportBlock.id}`}>
                  <SelectValue placeholder="Select a report" />
                </SelectTrigger>
                <SelectContent>
                  {reports?.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor={`quick-report-title-${reportBlock.id}`}>Title</Label>
              <Input
                id={`quick-report-title-${reportBlock.id}`}
                value={reportBlock.display.title}
                onChange={(event) => updateDisplay({ title: event.target.value })}
                placeholder="Sales summary"
              />
            </Field>
            <Field>
              <Label htmlFor={`quick-report-chart-${reportBlock.id}`}>Chart type</Label>
              <Select
                value={reportBlock.display.chartType}
                onValueChange={(value) =>
                  updateDisplay({ chartType: value as typeof reportBlock.display.chartType })
                }
              >
                <SelectTrigger id={`quick-report-chart-${reportBlock.id}`}>
                  <SelectValue placeholder="Chart type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_CHART_TYPES.map((chart) => (
                    <SelectItem key={chart} value={chart}>
                      {chart}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        );
      }
      case "trigger": {
        const triggerBlock = block as TriggerBlockDraft;
        const updateDisplay = (updates: Partial<typeof triggerBlock.display>) =>
          onBlockChange({
            ...triggerBlock,
            display: {
              ...triggerBlock.display,
              ...updates,
            },
          });
        return (
          <div className="space-y-4">
            <Field>
              <Label htmlFor={`quick-trigger-label-${triggerBlock.id}`}>Button label</Label>
              <Input
                id={`quick-trigger-label-${triggerBlock.id}`}
                value={triggerBlock.display.buttonText}
                onChange={(event) => updateDisplay({ buttonText: event.target.value })}
                placeholder="Run action"
              />
            </Field>
            <CheckboxField
              id={`quick-trigger-confirm-${triggerBlock.id}`}
              label="Require confirmation"
              checked={triggerBlock.display.requireConfirmation}
              onChange={(checked) => updateDisplay({ requireConfirmation: checked })}
            />
            {triggerBlock.display.requireConfirmation ? (
              <Field>
                <Label htmlFor={`quick-trigger-message-${triggerBlock.id}`}>Confirmation message</Label>
                <Textarea
                  id={`quick-trigger-message-${triggerBlock.id}`}
                  value={triggerBlock.display.confirmationText}
                  onChange={(event) => updateDisplay({ confirmationText: event.target.value })}
                  rows={3}
                />
              </Field>
            ) : null}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const actionButtons = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => setShowAdvanced((current) => !current)}
      >
        {showAdvanced ? "Simple" : "Advanced"}
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onToggleSettings}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8")}
            aria-label="Close settings"
          >
            <Settings2Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Close configuration</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onRemove}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-red-500")}
            aria-label="Remove block"
          >
            <Trash2Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Remove block</TooltipContent>
      </Tooltip>
    </>
  );

  const settingsOverlay = (
    <div className="absolute inset-0 z-20 flex flex-col rounded-lg border border-border bg-background/95 shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="flex min-h-[44px] items-center gap-3 bg-background/90 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-sm bg-muted px-2 py-1 text-[11px] uppercase tracking-wide">{block.type}</span>
          <span className="text-foreground">{block.id}</span>
        </div>
        <div className="ms-auto flex items-center justify-end gap-2">{actionButtons}</div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-4 md:px-5 md:py-5">
        {showAdvanced ? renderAdvancedSettings() : renderSimpleSettings()}
      </div>
    </div>
  );

  const vignette = (
    <div className="pointer-events-none absolute bottom-1 right-1 z-10 h-14 w-14 rounded-[28px] bg-linear-to-tl from-background via-background/80 to-transparent blur-sm" />
  );

  const renderWithChrome = () => (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg shadow-md shadow-black/10">
      <div
        className="absolute inset-x-0 top-0 flex min-h-[44px] items-center gap-3 bg-background/90 px-3 py-2 shadow-sm touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => onStartDrag(event, "drag")}
        role="presentation"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-sm bg-muted px-2 py-1 text-[11px] uppercase tracking-wide">{block.type}</span>
          <span className="text-foreground">{block.id}</span>
        </div>
        <div className="ms-auto flex items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onToggleSettings}
                className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8")}
                aria-label="Open block settings"
              >
                <Settings2Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Configure block</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onRemove}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-red-500")}
                aria-label="Remove block"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove block</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex h-full min-h-0 w-full flex-col pt-12">
        <div className="flex-1 min-h-0">{children}</div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onPointerDown={(event) => onStartDrag(event, "resize")}
            className={cn(
              buttonVariants({ variant: "secondary", size: "icon" }),
              "absolute bottom-2 right-2 z-30 h-8 w-8 cursor-se-resize touch-none"
            )}
            aria-label="Resize block"
          >
            <ExpandIcon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Resize block</TooltipContent>
      </Tooltip>
      {vignette}
      {isSettingsOpen ? settingsOverlay : null}
    </div>
  );

  const blockContent = (
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg shadow-md shadow-black/10">
        <div className="flex h-full min-h-0 w-full flex-col">
          <div className="flex-1 min-h-0">
            {renderBlock(block, urlParams, {
              onOpenSettings: onToggleSettings,
              onRemove,
              onStartDrag: (event) => onStartDrag(event, "drag"),
            })}
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onPointerDown={(event) => onStartDrag(event, "resize")}
              className={cn(
                buttonVariants({ variant: "secondary", size: "icon" }),
                "absolute bottom-2 right-2 z-30 h-8 w-8 cursor-se-resize touch-none"
              )}
              aria-label="Resize block"
            >
              <ExpandIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Resize block</TooltipContent>
        </Tooltip>
        {vignette}
        {isSettingsOpen ? settingsOverlay : null}
      </div>
  );

  const isChromeWrapped = !(block.type === "list" || block.type === "record");

  return (
    <>
      <ViewBlock
        id={block.id}
        type={block.type}
        position={block.position}
        // Framer Motion props passed to ViewBlock
        isDragging={isDragging}
      >
        {isDragging ? (
           <div className="h-full w-full rounded-lg border-2 border-dashed border-primary/50 bg-primary/5" />
        ) : (
           isChromeWrapped ? renderWithChrome() : blockContent
        )}
      </ViewBlock>
    </>
  );
}

function renderBlock(
  block: PageBlockDraft,
  urlParams: Record<string, string>,
  editControls?: {
    onOpenSettings: () => void;
    onRemove: () => void;
    onStartDrag: (event: ReactPointerEvent) => void;
  },
) {
  switch (block.type) {
    case "list":
      return <ListBlockView block={block} urlParams={urlParams} editControls={editControls} />;
    case "record":
      return <RecordBlockView block={block} urlParams={urlParams} editControls={editControls} />;
    case "report":
      return <ReportBlockView block={block} />;
    case "trigger":
      return <TriggerBlockView block={block} />;
    default:
      return null;
  }
}

function RecordSimpleSettings({
  block,
  onChange,
  tableOptions,
  tablesLoading,
}: {
  block: RecordBlockDraft;
  onChange: (block: RecordBlockDraft) => void;
  tableOptions: string[];
  tablesLoading: boolean;
}) {
  const { table: tableMetadata, isLoading: isMetadataLoading } = useTableMetadata(block.tableName || null);
  const availableFields = useMemo(() => tableMetadata?.config?.field_metadata ?? [], [tableMetadata]);

  const update = (updates: Partial<RecordBlockDraft>) => {
    onChange({
      ...block,
      ...updates,
    });
  };

  const updateDisplay = (updates: Partial<RecordBlockDraft["display"]>) => {
    update({
      display: {
        ...block.display,
        ...updates,
      },
    });
  };

  const tableChoices = tableOptions.length ? tableOptions : [block.tableName].filter(Boolean);
  const isAllSelected = block.display.columns.length === 0;
  const effectiveColumns = isAllSelected
    ? availableFields.map((field) => field.field_name)
    : block.display.columns;

  const handleFieldToggle = (fieldName: string, checked: boolean) => {
    const base = isAllSelected ? availableFields.map((field) => field.field_name) : block.display.columns;
    const next = checked
      ? Array.from(new Set([...base, fieldName]))
      : base.filter((column) => column !== fieldName);
    updateDisplay({ columns: next });
  };

  return (
    <div className="space-y-4">
      <Field>
        <Label htmlFor={`quick-record-table-${block.id}`}>Table</Label>
        {tableChoices.length > 0 ? (
          <Select
            value={block.tableName}
            onValueChange={(value) => update({ tableName: value })}
            disabled={tablesLoading}
          >
            <SelectTrigger id={`quick-record-table-${block.id}`}>
              <SelectValue placeholder="Select a table" />
            </SelectTrigger>
            <SelectContent>
              {tableChoices.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={`quick-record-table-${block.id}`}
            value={block.tableName}
            onChange={(event) => update({ tableName: event.target.value })}
            placeholder="customers"
          />
        )}
      </Field>

      <Field>
        <Label htmlFor={`quick-record-id-${block.id}`}>Record ID</Label>
        <Input
          id={`quick-record-id-${block.id}`}
          value={block.recordId}
          onChange={(event) => update({ recordId: event.target.value })}
          placeholder="uuid"
        />
      </Field>

      <Field>
        <Label htmlFor={`quick-record-mode-${block.id}`}>Mode</Label>
        <Select
          value={block.display.mode}
          onValueChange={(value) => updateDisplay({ mode: value as typeof block.display.mode })}
        >
          <SelectTrigger id={`quick-record-mode-${block.id}`}>
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            {RECORD_DISPLAY_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-foreground">Visible fields</div>
        {isMetadataLoading ? (
          <p className="text-sm text-muted-foreground">Loading fields…</p>
        ) : availableFields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fields available for this table.</p>
        ) : (
          <div className="space-y-2">
            {availableFields.map((field) => {
              const isChecked = isAllSelected ? true : effectiveColumns.includes(field.field_name);
              return (
                <div key={field.field_name} className="flex items-start gap-3">
                  <Checkbox
                    id={`record-field-${block.id}-${field.field_name}`}
                    checked={isChecked}
                    onCheckedChange={(next) => handleFieldToggle(field.field_name, Boolean(next))}
                  />
                  <div className="grid gap-1">
                    <Label htmlFor={`record-field-${block.id}-${field.field_name}`}>
                      {field.display_name ?? field.field_name}
                    </Label>
                    {field.description ? (
                      <p className="text-sm text-muted-foreground">{field.description}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FormatToggle({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: "table" | "cards" | "grid";
  onChange: (next: "table" | "cards" | "grid") => void;
}) {
  const options: Array<{
    value: "table" | "cards" | "grid";
    label: string;
    hint: string;
    preview: ReactNode;
  }> = [
    {
      value: "table",
      label: "Table",
      hint: "Rows and columns",
      preview: (
        <div className="grid grid-cols-3 gap-[2px]">
          <div className="h-1.5 rounded-sm bg-foreground/70" />
          <div className="h-1.5 rounded-sm bg-foreground/40" />
          <div className="h-1.5 rounded-sm bg-foreground/20" />
        </div>
      ),
    },
    {
      value: "cards",
      label: "Cards",
      hint: "Stacked cards",
      preview: (
        <div className="flex flex-col gap-[3px]">
          <div className="h-1.5 rounded-sm bg-foreground/70" />
          <div className="h-1.5 w-3/5 rounded-sm bg-foreground/30" />
        </div>
      ),
    },
    {
      value: "grid",
      label: "Grid",
      hint: "Tiled items",
      preview: (
        <div className="grid grid-cols-3 gap-[3px]">
          <div className="h-1.5 rounded-sm bg-foreground/70" />
          <div className="h-1.5 rounded-sm bg-foreground/50" />
          <div className="h-1.5 rounded-sm bg-foreground/30" />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-w-[140px] flex-1 items-center justify-between rounded-md border px-3 py-2 text-left transition",
              selected ? "border-primary/60 bg-primary/5 shadow-sm" : "border-border bg-background hover:bg-muted/40"
            )}
            aria-pressed={selected}
            aria-label={`${option.label} format`}
            id={`${idPrefix}-${option.value}`}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-foreground">{option.label}</div>
              <div className="text-[11px] text-muted-foreground">{option.hint}</div>
            </div>
            <div className="ms-3 h-8 w-14 rounded-sm border border-border/80 bg-muted/50 px-1.5 py-1">{option.preview}</div>
          </button>
        );
      })}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}


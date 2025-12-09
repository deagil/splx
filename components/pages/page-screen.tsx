"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { EyeIcon, EyeOffIcon, LayoutTemplateIcon, Loader2Icon, PenLineIcon, CheckIcon, PlusIcon } from "lucide-react";
import type { PageRecord } from "@/lib/server/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageGridEditor } from "./page-grid-editor";
import { PageViewer } from "./page-viewer";
import { draftToSavePayload, pageRecordToDraft } from "./transformers";
import type { PageBlockDraft, PageDraft, PageSavePayload } from "./types";
import { pageTemplates, type PageTemplate } from "./templates";
import { MentionContextProvider } from "./mention-context";
import { cn } from "@/lib/utils";

export type PageViewMode = "read" | "edit";

export type PageScreenProps = {
  page: PageRecord;
  viewMode: PageViewMode;
  urlParams: Record<string, string>;
  canEdit: boolean;
};

const AUTOSAVE_DELAY_MS = 800;

export function PageScreen({ page, viewMode, urlParams, canEdit }: PageScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState<PageRecord>(page);
  const [draft, setDraft] = useState<PageDraft>(() => pageRecordToDraft(page));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [newBlockOpen, setNewBlockOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const skipNextSave = useRef(true);
  const isEditView = viewMode === "edit";
  const isEditing = isEditView && canEdit;

  useEffect(() => {
    setCurrentPage(page);
    setDraft(pageRecordToDraft(page));
    skipNextSave.current = true;
  }, [page]);

  const urlParamMemo = useMemo(() => urlParams, [urlParams]);

  const handleToggleMode = () => {
    if (!canEdit) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (viewMode === "edit") {
      params.delete("viewMode");
    } else {
      params.set("viewMode", "edit");
    }

    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  const handleApplyTemplate = (template: PageTemplate) => {
    if (draft.blocks.length > 0 && typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Applying a template will replace the current blocks. Continue?",
      );
      if (!confirmed) {
        return;
      }
    }

    setDraft((current) => ({
      ...current,
      blocks: template.blocks.map((block) => ({
        ...block,
        id: `${block.id}-${nanoid(6)}`,
      })),
      settings: {
        ...current.settings,
        ...template.settings,
        urlParams:
          template.settings?.urlParams?.map((param) => ({
            ...param,
            id: param.id ?? nanoid(6),
          })) ?? current.settings.urlParams,
      },
    }));
    skipNextSave.current = false;
    setTemplateOpen(false);
  };

  const saveDraft = async (payload: PageSavePayload) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/pages/${currentPage.id}/save`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to save page";
        try {
          const data = await response.json();
          if (data?.error && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // swallow
        }
        throw new Error(message);
      }

      const data = await response.json();
      if (data?.page) {
        const updatedPage = data.page as PageRecord;
        if (updatedPage.id !== currentPage.id) {
          const query = searchParams.toString();
          const nextPath = `/pages/${updatedPage.id}`;
          router.replace(query ? `${nextPath}?${query}` : nextPath);
        }
        setCurrentPage(updatedPage);
        skipNextSave.current = true;
        setDraft(pageRecordToDraft(updatedPage));
      }
      setLastSavedAt(new Date().toISOString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isEditing || !canEdit) {
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      void saveDraft(draftToSavePayload(draft));
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [draft, isEditing, canEdit]);

  const statusLabel = isSaving
    ? "Saving…"
    : error
      ? "Save failed"
      : lastSavedAt
        ? "Saved"
        : "Idle";

  const templateOptions = useMemo(
    () => pageTemplates.filter((template) => template.id === "list-view" || template.id === "detail-view"),
    [],
  );

  const showHeader = isEditView || !draft.settings.hideHeader;
  const headerMuted = isEditView && draft.settings.hideHeader;

  const blockDefaults = (type: PageBlockDraft["type"]): PageBlockDraft => {
    switch (type) {
      case "record":
        return {
          id: nanoid(8),
          type: "record",
          position: { x: 0, y: 0, width: 6, height: 5 },
          tableName: "records",
          recordId: "url.id",
          display: { mode: "read", format: "form", columns: [] },
        };
      case "report":
        return {
          id: nanoid(8),
          type: "report",
          position: { x: 0, y: 0, width: 6, height: 4 },
          reportId: "report-id",
          display: { chartType: "bar", title: "Report" },
        };
      case "trigger":
        return {
          id: nanoid(8),
          type: "trigger",
          position: { x: 0, y: 0, width: 4, height: 2 },
          display: {
            buttonText: "Run action",
            actionType: "primary",
            requireConfirmation: false,
            confirmationText: "",
            hookName: "custom_hook",
          },
        };
      case "list":
      default:
        return {
          id: nanoid(8),
          type: "list",
          position: { x: 0, y: 0, width: 6, height: 4 },
          tableName: "records",
          filters: [],
          display: {
            format: "table",
            showActions: true,
            editable: false,
            columns: [],
          },
        };
    }
  };

  const blocksOverlap = (a: PageBlockDraft, b: PageBlockDraft) => {
    return !(
      a.position.x + a.position.width <= b.position.x ||
      b.position.x + b.position.width <= a.position.x ||
      a.position.y + a.position.height <= b.position.y ||
      b.position.y + b.position.height <= a.position.y
    );
  };

  const findPlacement = (blocks: PageBlockDraft[], candidate: PageBlockDraft) => {
    const width = candidate.position.width;
    const height = candidate.position.height;
    const GRID_COLS = 12;

    const collides = (pos: { x: number; y: number }) => {
      const placed = { ...candidate, position: { ...pos, width, height } };
      return blocks.some((block) => blocksOverlap(placed, block));
    };

    const anchor = blocks[blocks.length - 1];
    if (anchor) {
      const rightX = anchor.position.x + anchor.position.width;
      const spaceRight = GRID_COLS - rightX;
      if (spaceRight >= width && !collides({ x: rightX, y: anchor.position.y })) {
        return { x: rightX, y: anchor.position.y };
      }
      const belowY = anchor.position.y + anchor.position.height;
      if (!collides({ x: anchor.position.x, y: belowY })) {
        return { x: anchor.position.x, y: belowY };
      }
    }

    const maxY = blocks.reduce((max, block) => Math.max(max, block.position.y + block.position.height), 0);
    for (let y = 0; y <= maxY + 1; y += 1) {
      for (let x = 0; x <= GRID_COLS - width; x += 1) {
        if (!collides({ x, y })) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: maxY + 1 };
  };

  const handleAddBlock = (type: PageBlockDraft["type"]) => {
    setDraft((current) => {
      const candidate = blockDefaults(type);
      const position = findPlacement(current.blocks, candidate);
      const placed = { ...candidate, position: { ...candidate.position, ...position } };
      return {
        ...current,
        blocks: [...current.blocks, placed],
      };
    });
    setNewBlockOpen(false);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <TooltipProvider delayDuration={80}>
        {showHeader ? (
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className={cn("space-y-2", headerMuted ? "opacity-60" : undefined)}>
              {isEditing ? (
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="text-2xl font-semibold"
                  aria-label="Page name"
                />
              ) : (
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{currentPage.name}</h1>
              )}
              {isEditing ? (
                <Input
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional summary shown in headers"
                  aria-label="Page description"
                />
              ) : currentPage.description ? (
                <p className="text-sm text-muted-foreground">{currentPage.description}</p>
              ) : null}
            </div>

            {isEditing ? (
              <div className="flex flex-1 justify-center">
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">
                  {isSaving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>{statusLabel}</span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 md:ms-auto">
              {isEditing ? (
                <>
                  <Popover open={newBlockOpen} onOpenChange={setNewBlockOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Add block"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Add block</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-[280px] space-y-3" align="end">
                      <p className="text-sm font-semibold text-foreground">Add block</p>
                      <div className="grid gap-2">
                        {[
                          { type: "list", label: "List", description: "Table view with pagination" },
                          { type: "record", label: "Record", description: "Single record form/view" },
                          { type: "report", label: "Report", description: "Chart from saved report" },
                          { type: "trigger", label: "Trigger", description: "Action button with hook" },
                        ].map((option) => (
                          <button
                            key={option.type}
                            type="button"
                            onClick={() => handleAddBlock(option.type as PageBlockDraft["type"])}
                            className="flex flex-col gap-1 rounded-md border border-border/70 p-3 text-left transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="text-sm font-semibold text-foreground">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Open templates"
                          >
                            <LayoutTemplateIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Templates</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-[360px] space-y-3" align="end">
                      <p className="text-sm font-semibold text-foreground">Templates</p>
                      <div className="grid gap-3">
                        {templateOptions.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleApplyTemplate(template)}
                            className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 text-left transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{template.name}</p>
                                <p className="text-xs text-muted-foreground">{template.description}</p>
                              </div>
                            </div>
                            <TemplatePreview rows={template.preview} />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={draft.settings.hideHeader ? "secondary" : "outline"}
                        size="icon"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            settings: {
                              ...current.settings,
                              hideHeader: !current.settings.hideHeader,
                            },
                          }))
                        }
                        aria-label={draft.settings.hideHeader ? "Show header" : "Hide header"}
                      >
                        {draft.settings.hideHeader ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{draft.settings.hideHeader ? "Show header" : "Hide header"}</TooltipContent>
                  </Tooltip>
                </>
              ) : null}

              {canEdit ? (
                <Button
                  type="button"
                  variant={isEditing ? "primary" : "outline"}
                  onClick={handleToggleMode}
                  disabled={isPending}
                  className="gap-2"
                >
                  {isEditing ? null : <PenLineIcon className="h-4 w-4" />}
                  {isEditing ? "Done" : "Edit Page"}
                </Button>
              ) : null}
            </div>
          </header>
        ) : null}
      </TooltipProvider>

      {error ? (
        <div className="rounded-md border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {isEditing ? (
        <MentionContextProvider page={currentPage}>
          <PageGridEditor draft={draft} onDraftChange={setDraft} urlParams={urlParamMemo} />
        </MentionContextProvider>
      ) : (
        <PageViewer page={currentPage} urlParams={urlParamMemo} />
      )}

    </div>
  );
}

function TemplatePreview({ rows }: { rows: PageTemplate["preview"] }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/60 p-2">
      <div className="space-y-2 rounded-sm border border-border/60 bg-background px-3 py-3 shadow-inner">
        {rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-2">
            {row.columns.map((column, columnIndex) => (
              <div
                key={`col-${columnIndex}`}
                className="rounded-sm px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-background"
                style={{
                  flex: column.span,
                  backgroundColor: previewColor(column.variant),
                }}
              >
                {column.label ?? column.variant ?? "Block"}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function previewColor(variant?: "record" | "list" | "trigger" | "report") {
  switch (variant) {
    case "record":
      return "rgba(59, 130, 246, 0.8)";
    case "list":
      return "rgba(16, 185, 129, 0.8)";
    case "trigger":
      return "rgba(249, 115, 22, 0.8)";
    case "report":
      return "rgba(139, 92, 246, 0.8)";
    default:
      return "rgba(107, 114, 128, 0.6)";
  }
}


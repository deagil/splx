"use client";

import {
  EyeIcon,
  EyeOffIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  PenLineIcon,
  PlusIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import type { PageRecord } from "@/lib/server/pages";
import { cn } from "@/lib/utils";
import { MentionContextProvider } from "./mention-context";
import { PageGridEditor } from "./page-grid-editor";
import { PageViewer } from "./page-viewer";
import { type PageTemplate, pageTemplates } from "./templates";
import { draftToSavePayload, pageRecordToDraft } from "./transformers";
import type { PageBlockDraft, PageDraft, PageSavePayload } from "./types";

export type PageViewMode = "read" | "edit";

export interface PageScreenProps {
  canEdit: boolean;
  page: PageRecord;
  urlParams: Record<string, string>;
  viewMode: PageViewMode;
}

const AUTOSAVE_DELAY_MS = 800;

export function PageScreen({
  page,
  viewMode,
  urlParams,
  canEdit,
}: PageScreenProps) {
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
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  };

  const handleApplyTemplate = (template: PageTemplate) => {
    if (draft.blocks.length > 0 && typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Applying a template will replace the current blocks. Continue?"
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
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
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
      setError(
        caught instanceof Error ? caught.message : "Unexpected error occurred"
      );
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
  }, [draft, isEditing, canEdit, saveDraft]);

  const statusLabel = isSaving
    ? "Saving…"
    : error
      ? "Save failed"
      : lastSavedAt
        ? "Saved"
        : "Idle";

  const templateOptions = useMemo(
    () =>
      pageTemplates.filter(
        (template) =>
          template.id === "list-view" || template.id === "detail-view"
      ),
    []
  );

  const showHeader = isEditView || !draft.settings.hideHeader;
  const headerMuted = isEditView && draft.settings.hideHeader;

  const blockDefaults = (type: PageBlockDraft["type"]): PageBlockDraft => {
    switch (type) {
      case "record":
        return {
          display: { columns: [], format: "form", mode: "read" },
          id: nanoid(8),
          position: { height: 5, width: 6, x: 0, y: 0 },
          recordId: "url.id",
          tableName: "records",
          type: "record",
        };
      case "report":
        return {
          display: { chartType: "bar", title: "Report" },
          id: nanoid(8),
          position: { height: 4, width: 6, x: 0, y: 0 },
          reportId: "report-id",
          type: "report",
        };
      case "trigger":
        return {
          display: {
            actionType: "primary",
            buttonText: "Run action",
            confirmationText: "",
            hookName: "custom_hook",
            requireConfirmation: false,
          },
          id: nanoid(8),
          position: { height: 2, width: 4, x: 0, y: 0 },
          type: "trigger",
        };
      default:
        return {
          display: {
            columns: [],
            editable: false,
            format: "table",
            showActions: true,
          },
          filters: [],
          id: nanoid(8),
          position: { height: 4, width: 6, x: 0, y: 0 },
          tableName: "records",
          type: "list",
        };
    }
  };

  const blocksOverlap = (a: PageBlockDraft, b: PageBlockDraft) =>
    !(
      a.position.x + a.position.width <= b.position.x ||
      b.position.x + b.position.width <= a.position.x ||
      a.position.y + a.position.height <= b.position.y ||
      b.position.y + b.position.height <= a.position.y
    );

  const findPlacement = (
    blocks: PageBlockDraft[],
    candidate: PageBlockDraft
  ) => {
    const { width, height } = candidate.position;
    const GRID_COLS = 12;

    const collides = (pos: { x: number; y: number }) => {
      const placed = { ...candidate, position: { ...pos, height, width } };
      return blocks.some((block) => blocksOverlap(placed, block));
    };

    const anchor = blocks.at(-1);
    if (anchor) {
      const rightX = anchor.position.x + anchor.position.width;
      const spaceRight = GRID_COLS - rightX;
      if (
        spaceRight >= width &&
        !collides({ x: rightX, y: anchor.position.y })
      ) {
        return { x: rightX, y: anchor.position.y };
      }
      const belowY = anchor.position.y + anchor.position.height;
      if (!collides({ x: anchor.position.x, y: belowY })) {
        return { x: anchor.position.x, y: belowY };
      }
    }

    const maxY = blocks.reduce(
      (max, block) => Math.max(max, block.position.y + block.position.height),
      0
    );
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
      const placed = {
        ...candidate,
        position: { ...candidate.position, ...position },
      };
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
            <div
              className={cn(
                "space-y-2",
                headerMuted ? "opacity-60" : undefined
              )}
            >
              {isEditing ? (
                <Input
                  aria-label="Page name"
                  className="font-semibold text-2xl"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  value={draft.name}
                />
              ) : (
                <h1 className="font-semibold text-3xl text-foreground tracking-tight">
                  {currentPage.name}
                </h1>
              )}
              {isEditing ? (
                <Input
                  aria-label="Page description"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional summary shown in headers"
                  value={draft.description ?? ""}
                />
              ) : currentPage.description ? (
                <p className="text-muted-foreground text-sm">
                  {currentPage.description}
                </p>
              ) : null}
            </div>

            {isEditing ? (
              <div className="flex flex-1 justify-center">
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1 text-muted-foreground text-xs">
                  {isSaving ? (
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  <span>{statusLabel}</span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 md:ms-auto">
              {isEditing ? (
                <>
                  <Popover onOpenChange={setNewBlockOpen} open={newBlockOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button
                            aria-label="Add block"
                            size="icon"
                            type="button"
                            variant="outline"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Add block</TooltipContent>
                    </Tooltip>
                    <PopoverContent align="end" className="w-[280px] space-y-3">
                      <p className="font-semibold text-foreground text-sm">
                        Add block
                      </p>
                      <div className="grid gap-2">
                        {[
                          {
                            description: "Table view with pagination",
                            label: "List",
                            type: "list",
                          },
                          {
                            description: "Single record form/view",
                            label: "Record",
                            type: "record",
                          },
                          {
                            description: "Chart from saved report",
                            label: "Report",
                            type: "report",
                          },
                          {
                            description: "Action button with hook",
                            label: "Trigger",
                            type: "trigger",
                          },
                        ].map((option) => (
                          <button
                            className="flex flex-col gap-1 rounded-md border border-border/70 p-3 text-left transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            key={option.type}
                            onClick={() =>
                              handleAddBlock(
                                option.type as PageBlockDraft["type"]
                              )
                            }
                            type="button"
                          >
                            <span className="font-semibold text-foreground text-sm">
                              {option.label}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover onOpenChange={setTemplateOpen} open={templateOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button
                            aria-label="Open templates"
                            size="icon"
                            type="button"
                            variant="outline"
                          >
                            <LayoutTemplateIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Templates</TooltipContent>
                    </Tooltip>
                    <PopoverContent align="end" className="w-[360px] space-y-3">
                      <p className="font-semibold text-foreground text-sm">
                        Templates
                      </p>
                      <div className="grid gap-3">
                        {templateOptions.map((template) => (
                          <button
                            className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 text-left transition hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            key={template.id}
                            onClick={() => handleApplyTemplate(template)}
                            type="button"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-foreground text-sm">
                                  {template.name}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {template.description}
                                </p>
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
                        aria-label={
                          draft.settings.hideHeader
                            ? "Show header"
                            : "Hide header"
                        }
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            settings: {
                              ...current.settings,
                              hideHeader: !current.settings.hideHeader,
                            },
                          }))
                        }
                        size="icon"
                        type="button"
                        variant={
                          draft.settings.hideHeader ? "secondary" : "outline"
                        }
                      >
                        {draft.settings.hideHeader ? (
                          <EyeIcon className="h-4 w-4" />
                        ) : (
                          <EyeOffIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {draft.settings.hideHeader
                        ? "Show header"
                        : "Hide header"}
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : null}

              {canEdit ? (
                <Button
                  className="gap-2"
                  disabled={isPending}
                  onClick={handleToggleMode}
                  type="button"
                  variant={isEditing ? "primary" : "outline"}
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
        <div className="rounded-md border border-red-400 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      {isEditing ? (
        <MentionContextProvider page={currentPage}>
          <PageGridEditor
            draft={draft}
            onDraftChange={setDraft}
            urlParams={urlParamMemo}
          />
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
          <div className="flex gap-2" key={`row-${rowIndex}`}>
            {row.columns.map((column, columnIndex) => (
              <div
                className="rounded-sm px-2 py-2 text-center font-semibold text-[10px] text-background uppercase tracking-wide"
                key={`col-${columnIndex}`}
                style={{
                  backgroundColor: previewColor(column.variant),
                  flex: column.span,
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

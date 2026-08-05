"use client";

import { nanoid } from "nanoid";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PageRecord } from "@/lib/server/pages";
import type { ReportRecord } from "@/lib/server/reports";
import { cn } from "@/lib/utils";
import { useReports } from "../hooks";
import { type PageTemplate, pageTemplates } from "../templates";
import { draftToSavePayload, pageRecordToDraft } from "../transformers";
import type {
  ListBlockDraft,
  ListBlockFilter,
  ListFilterOperator,
  PageBlockDraft,
  PageDraft,
  PageSavePayload,
  PageUrlParamDraft,
  RecordBlockDraft,
  ReportBlockDraft,
  TriggerBlockDraft,
} from "../types";
import {
  LIST_DISPLAY_FORMATS,
  LIST_FILTER_OPERATORS,
  RECORD_DISPLAY_FORMATS,
  RECORD_DISPLAY_MODES,
  REPORT_CHART_TYPES,
  TRIGGER_ACTION_TYPES,
} from "../types";

export interface PageBuilderProps {
  initialPage: PageRecord;
  isSaving?: boolean;
  onReset?: () => void;
  onSave: (payload: PageSavePayload) => Promise<void> | void;
}

export function PageBuilder({
  initialPage,
  onSave,
  onReset,
  isSaving = false,
}: PageBuilderProps) {
  const [draft, setDraft] = useState<PageDraft>(() =>
    pageRecordToDraft(initialPage)
  );
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const { reports } = useReports();

  useEffect(() => {
    setDraft(pageRecordToDraft(initialPage));
  }, [initialPage]);

  useEffect(() => {
    setSaving(isSaving);
  }, [isSaving]);

  const handleReset = () => {
    setDraft(pageRecordToDraft(initialPage));
    onReset?.();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = draftToSavePayload(draft);
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = (template: PageTemplate) => {
    if (
      draft.blocks.length > 0 &&
      template.id !== selectedTemplateId &&
      typeof window !== "undefined"
    ) {
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
    setSelectedTemplateId(template.id);
  };

  const handleUpdateBlock = (blockId: string, update: PageBlockDraft) => {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...update } : block
      ),
    }));
  };

  const handleRemoveBlock = (blockId: string) => {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== blockId),
    }));
  };

  const handleUpdateParam = (
    paramId: string,
    update: Partial<PageUrlParamDraft>
  ) => {
    setDraft((current) => ({
      ...current,
      settings: {
        ...current.settings,
        urlParams: current.settings.urlParams.map((param) =>
          param.id === paramId ? { ...param, ...update } : param
        ),
      },
    }));
  };

  const handleAddParam = () => {
    setDraft((current) => ({
      ...current,
      settings: {
        ...current.settings,
        urlParams: [
          ...current.settings.urlParams,
          {
            description: "",
            id: nanoid(8),
            name: "",
            required: false,
          },
        ],
      },
    }));
  };

  const handleRemoveParam = (paramId: string) => {
    setDraft((current) => ({
      ...current,
      settings: {
        ...current.settings,
        urlParams: current.settings.urlParams.filter(
          (param) => param.id !== paramId
        ),
      },
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground text-xl">
              Page settings
            </h2>
            <p className="text-muted-foreground text-sm">
              Configure the slug, metadata, and top-level options for this page.
            </p>
          </div>
          <div className="flex gap-3">
            {onReset ? (
              <Button
                disabled={saving}
                onClick={handleReset}
                type="button"
                variant="outline"
              >
                Reset
              </Button>
            ) : null}
            <Button disabled={saving} onClick={handleSave} type="button">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field>
            <Label htmlFor="page-slug">Slug / route</Label>
            <Input
              autoCapitalize="none"
              id="page-slug"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  id: normalizeSlug(event.target.value),
                }))
              }
              placeholder="workflows"
              value={draft.id}
            />
            <p className="text-muted-foreground text-xs">
              URL: /pages/
              <span className="font-mono text-foreground">{draft.id}</span>
            </p>
          </Field>
          <Field>
            <Label htmlFor="page-name">Name</Label>
            <Input
              id="page-name"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Customer detail"
              value={draft.name}
            />
          </Field>
          <Field>
            <Label htmlFor="page-description">Description</Label>
            <Input
              id="page-description"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Optional summary shown in headers"
              value={draft.description ?? ""}
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md border border-border/70 p-4">
          <div>
            <p className="font-medium text-foreground text-sm">
              Show page header
            </p>
            <p className="text-muted-foreground text-xs">
              Toggle the title and description section for viewers.
            </p>
          </div>
          <CheckboxField
            checked={!draft.settings.hideHeader}
            id="page-header"
            label=""
            onChange={(checked) =>
              setDraft((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  hideHeader: !checked,
                },
              }))
            }
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
        <header className="flex flex-col gap-2">
          <h2 className="font-semibold text-foreground text-xl">
            Choose a template
          </h2>
          <p className="text-muted-foreground text-sm">
            Pick a layout template to scaffold blocks. You can still edit
            tables, filters, and text after applying a template.
          </p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              onApply={() => handleApplyTemplate(template)}
              selected={selectedTemplateId === template.id}
              template={template}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              URL parameters
            </h3>
            <p className="text-muted-foreground text-sm">
              Document the query parameters the page expects. Each parameter can
              be referenced by blocks using <code>url.paramName</code>.
            </p>
          </div>
          <Button onClick={handleAddParam} type="button" variant="outline">
            Add parameter
          </Button>
        </header>

        <div className="mt-4 flex flex-col gap-4">
          {draft.settings.urlParams.length === 0 ? (
            <EmptyState message="No URL parameters configured yet." />
          ) : (
            draft.settings.urlParams.map((param) => (
              <div
                className="rounded-md border border-border/80 border-dashed p-4"
                key={param.id}
              >
                <div className="grid gap-3 md:grid-cols-[2fr,1fr,auto] md:items-end">
                  <Field>
                    <Label htmlFor={`url-param-${param.id}`}>Name</Label>
                    <Input
                      id={`url-param-${param.id}`}
                      onChange={(event) =>
                        handleUpdateParam(param.id, {
                          name: event.target.value,
                        })
                      }
                      placeholder="customerId"
                      value={param.name}
                    />
                  </Field>
                  <div className="flex items-center gap-3">
                    <CheckboxField
                      checked={param.required}
                      id={`url-param-required-${param.id}`}
                      label="Required"
                      onChange={(checked) =>
                        handleUpdateParam(param.id, {
                          required: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      className={cn(
                        buttonVariants({ size: "sm", variant: "ghost" }),
                        "text-red-500 hover:text-red-500"
                      )}
                      onClick={() => handleRemoveParam(param.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <Field className="mt-3">
                  <Label htmlFor={`url-param-description-${param.id}`}>
                    Description
                  </Label>
                  <Input
                    id={`url-param-description-${param.id}`}
                    onChange={(event) =>
                      handleUpdateParam(param.id, {
                        description: event.target.value,
                      })
                    }
                    placeholder="Used to resolve selected record"
                    value={param.description ?? ""}
                  />
                </Field>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground text-lg">Blocks</h3>
            <p className="text-muted-foreground text-sm">
              Adjust data sources and filters. Layout is controlled by the
              template.
            </p>
          </div>
        </header>

        <div className="mt-4 flex flex-col gap-5">
          {draft.blocks.length === 0 ? (
            <EmptyState message="No blocks added yet. Add a block to get started." />
          ) : (
            draft.blocks.map((block) => (
              <BlockEditor
                block={block}
                key={block.id}
                onChange={(updated) => handleUpdateBlock(block.id, updated)}
                onRemove={() => handleRemoveBlock(block.id)}
                reports={reports}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

interface TemplateCardProps {
  onApply: () => void;
  selected: boolean;
  template: PageTemplate;
}

function TemplateCard({ template, selected, onApply }: TemplateCardProps) {
  return (
    <button
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:bg-muted/40"
      )}
      onClick={onApply}
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
        {selected ? (
          <span className="font-medium text-primary text-xs">Selected</span>
        ) : (
          <span className="text-muted-foreground text-xs">Apply</span>
        )}
      </div>
      <TemplatePreview rows={template.preview} />
    </button>
  );
}

interface TemplatePreviewProps {
  rows: PageTemplate["preview"];
}

function TemplatePreview({ rows }: TemplatePreviewProps) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/80 p-3">
      <div className="rounded-md border border-border/70 bg-background px-3 pt-2 pb-4 shadow-inner">
        <div className="mb-2 flex gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-yellow-400" />
          <span className="h-2 w-2 rounded-full bg-green-400" />
        </div>
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div className="flex gap-2" key={`row-${rowIndex}`}>
              {row.columns.map((column, columnIndex) => (
                <div
                  className={cn(
                    "rounded-sm px-2 py-3 text-center font-semibold text-[10px] text-background uppercase tracking-wide",
                    column.variant === "record"
                      ? "bg-blue-500/80"
                      : column.variant === "list"
                        ? "bg-emerald-500/80"
                        : column.variant === "trigger"
                          ? "bg-orange-500/80"
                          : "bg-purple-500/70"
                  )}
                  key={`col-${columnIndex}`}
                  style={{ flex: column.span }}
                >
                  {column.label ?? column.variant ?? "Block"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface BlockEditorProps {
  block: PageBlockDraft;
  onChange: (block: PageBlockDraft) => void;
  onRemove: () => void;
  reports?: any[];
}

function BlockEditor({ block, onChange, onRemove, reports }: BlockEditorProps) {
  const typeLabel = block.type.charAt(0).toUpperCase() + block.type.slice(1);

  return (
    <article className="rounded-lg border border-border/60 bg-muted/10 p-5 shadow-sm">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <Field className="md:max-w-xs">
            <Label htmlFor={`block-id-${block.id}`}>Block ID</Label>
            <Input
              id={`block-id-${block.id}`}
              onChange={(event) =>
                onChange({
                  ...block,
                  id: event.target.value,
                })
              }
              value={block.id}
            />
          </Field>
          <div className="rounded-md border border-border/70 px-3 py-2 font-medium text-muted-foreground text-sm">
            {typeLabel} block
          </div>
        </div>
        <Button
          className="self-start text-red-500 hover:text-red-500"
          onClick={onRemove}
          type="button"
          variant="ghost"
        >
          Remove {typeLabel} block
        </Button>
      </header>

      <div className="mt-6">
        {block.type === "list" ? (
          <ListBlockForm block={block} onChange={onChange} />
        ) : null}
        {block.type === "record" ? (
          <RecordBlockForm block={block} onChange={onChange} />
        ) : null}
        {block.type === "report" ? (
          <ReportBlockForm
            block={block}
            onChange={onChange}
            reports={reports}
          />
        ) : null}
        {block.type === "trigger" ? (
          <TriggerBlockForm block={block} onChange={onChange} />
        ) : null}
      </div>
    </article>
  );
}

function ListBlockForm({
  block,
  onChange,
}: {
  block: ListBlockDraft;
  onChange: (block: ListBlockDraft) => void;
}) {
  const update = (updates: Partial<ListBlockDraft>) => {
    onChange({
      ...block,
      ...updates,
    });
  };

  const updateDisplay = (updates: Partial<ListBlockDraft["display"]>) => {
    update({
      display: {
        ...block.display,
        ...updates,
      },
    });
  };

  const filters = useMemo(() => block.filters ?? [], [block.filters]);

  const handleFilterUpdate = (
    filterId: string,
    updates: Partial<ListBlockFilter>
  ) => {
    update({
      filters: filters.map((filter) =>
        filter.id === filterId ? { ...filter, ...updates } : filter
      ),
    });
  };

  const handleAddFilter = () => {
    update({
      filters: [
        ...filters,
        {
          column: "",
          id: nanoid(10),
          operator: "equals",
          value: "",
        },
      ],
    });
  };

  const handleRemoveFilter = (filterId: string) => {
    update({
      filters: filters.filter((filter) => filter.id !== filterId),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <h4 className="font-semibold text-base text-foreground">
        List configuration
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`list-table-${block.id}`}>Table</Label>
          <Input
            id={`list-table-${block.id}`}
            onChange={(event) => update({ tableName: event.target.value })}
            placeholder="customers"
            value={block.tableName}
          />
        </Field>
        <Field>
          <Label htmlFor={`list-format-${block.id}`}>Display format</Label>
          <Select
            onValueChange={(value) =>
              updateDisplay({
                format: value as ListBlockDraft["display"]["format"],
              })
            }
            value={block.display.format}
          >
            <SelectTrigger id={`list-format-${block.id}`}>
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              {LIST_DISPLAY_FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CheckboxField
          checked={block.display.showActions}
          id={`list-actions-${block.id}`}
          label="Show row actions"
          onChange={(checked) => updateDisplay({ showActions: checked })}
        />
        <CheckboxField
          checked={block.display.editable}
          id={`list-editable-${block.id}`}
          label="Inline editable"
          onChange={(checked) => updateDisplay({ editable: checked })}
        />
        <Field>
          <Label htmlFor={`list-columns-${block.id}`}>Visible columns</Label>
          <Input
            id={`list-columns-${block.id}`}
            onChange={(event) =>
              updateDisplay({
                columns: event.target.value
                  .split(",")
                  .map((column) => column.trim())
                  .filter(Boolean),
              })
            }
            placeholder="id, email, status"
            value={block.display.columns.join(", ")}
          />
        </Field>
      </div>

      <div>
        <h5 className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          Table Features
        </h5>
        <div className="grid gap-4 md:grid-cols-3">
          <CheckboxField
            checked={block.display.enableSearch ?? true}
            id={`list-search-${block.id}`}
            label="Enable search"
            onChange={(checked) => updateDisplay({ enableSearch: checked })}
          />
          <CheckboxField
            checked={block.display.enableRowSelection ?? false}
            id={`list-row-selection-${block.id}`}
            label="Row selection"
            onChange={(checked) =>
              updateDisplay({ enableRowSelection: checked })
            }
          />
          <CheckboxField
            checked={block.display.enableStickyHeader ?? true}
            id={`list-sticky-header-${block.id}`}
            label="Sticky headers"
            onChange={(checked) =>
              updateDisplay({ enableStickyHeader: checked })
            }
          />
          <CheckboxField
            checked={block.display.enableColumnVisibility ?? false}
            id={`list-column-visibility-${block.id}`}
            label="Column visibility toggle"
            onChange={(checked) =>
              updateDisplay({ enableColumnVisibility: checked })
            }
          />
          <CheckboxField
            checked={block.display.enableColumnResize ?? false}
            id={`list-column-resize-${block.id}`}
            label="Column resizing"
            onChange={(checked) =>
              updateDisplay({ enableColumnResize: checked })
            }
          />
          <CheckboxField
            checked={block.display.enableColumnPin ?? false}
            id={`list-column-pin-${block.id}`}
            label="Column pinning"
            onChange={(checked) => updateDisplay({ enableColumnPin: checked })}
          />
          <CheckboxField
            checked={block.display.enableColumnDrag ?? false}
            id={`list-column-drag-${block.id}`}
            label="Column reordering"
            onChange={(checked) => updateDisplay({ enableColumnDrag: checked })}
          />
          <Field>
            <Label htmlFor={`list-page-size-${block.id}`}>Page size</Label>
            <Input
              id={`list-page-size-${block.id}`}
              max={100}
              min={1}
              onChange={(event) =>
                updateDisplay({
                  defaultPageSize:
                    Number.parseInt(event.target.value, 10) || 10,
                })
              }
              placeholder="10"
              type="number"
              value={block.display.defaultPageSize ?? 10}
            />
          </Field>
          <Field>
            <Label htmlFor={`list-search-placeholder-${block.id}`}>
              Search placeholder
            </Label>
            <Input
              id={`list-search-placeholder-${block.id}`}
              onChange={(event) =>
                updateDisplay({
                  searchPlaceholder: event.target.value || undefined,
                })
              }
              placeholder="Search..."
              value={block.display.searchPlaceholder ?? ""}
            />
          </Field>
        </div>
      </div>

      <div>
        <header className="flex items-center justify-between">
          <h5 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Filters
          </h5>
          <Button onClick={handleAddFilter} type="button" variant="outline">
            Add filter
          </Button>
        </header>
        <div className="mt-3 flex flex-col gap-3">
          {filters.length === 0 ? (
            <EmptyState message="No filters applied." />
          ) : (
            filters.map((filter) => (
              <div
                className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-[1fr,1fr,1fr,auto]"
                key={filter.id}
              >
                <Field>
                  <Label htmlFor={`filter-column-${filter.id}`}>Column</Label>
                  <Input
                    id={`filter-column-${filter.id}`}
                    onChange={(event) =>
                      handleFilterUpdate(filter.id, {
                        column: event.target.value,
                      })
                    }
                    placeholder="customer_id"
                    value={filter.column}
                  />
                </Field>
                <Field>
                  <Label htmlFor={`filter-operator-${filter.id}`}>
                    Operator
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      handleFilterUpdate(filter.id, {
                        operator: value as ListFilterOperator,
                      })
                    }
                    value={filter.operator}
                  >
                    <SelectTrigger id={`filter-operator-${filter.id}`}>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIST_FILTER_OPERATORS.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {operator}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor={`filter-value-${filter.id}`}>Value</Label>
                  <Input
                    id={`filter-value-${filter.id}`}
                    onChange={(event) =>
                      handleFilterUpdate(filter.id, {
                        value: event.target.value,
                      })
                    }
                    placeholder="url.customerId"
                    value={filter.value}
                  />
                </Field>
                <Button
                  className="self-end text-red-500 hover:text-red-500"
                  onClick={() => handleRemoveFilter(filter.id)}
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RecordBlockForm({
  block,
  onChange,
}: {
  block: RecordBlockDraft;
  onChange: (block: RecordBlockDraft) => void;
}) {
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

  return (
    <div className="flex flex-col gap-5">
      <h4 className="font-semibold text-base text-foreground">
        Record configuration
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`record-table-${block.id}`}>Table</Label>
          <Input
            id={`record-table-${block.id}`}
            onChange={(event) => update({ tableName: event.target.value })}
            placeholder="customers"
            value={block.tableName}
          />
        </Field>
        <Field>
          <Label htmlFor={`record-id-${block.id}`}>Record ID</Label>
          <Input
            id={`record-id-${block.id}`}
            onChange={(event) => update({ recordId: event.target.value })}
            placeholder="url.customerId"
            value={block.recordId}
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field>
          <Label htmlFor={`record-mode-${block.id}`}>Mode</Label>
          <Select
            onValueChange={(value) =>
              updateDisplay({
                mode: value as RecordBlockDraft["display"]["mode"],
              })
            }
            value={block.display.mode}
          >
            <SelectTrigger id={`record-mode-${block.id}`}>
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
        <Field>
          <Label htmlFor={`record-format-${block.id}`}>Display</Label>
          <Select
            onValueChange={(value) =>
              updateDisplay({
                format: value as RecordBlockDraft["display"]["format"],
              })
            }
            value={block.display.format}
          >
            <SelectTrigger id={`record-format-${block.id}`}>
              <SelectValue placeholder="Display" />
            </SelectTrigger>
            <SelectContent>
              {RECORD_DISPLAY_FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="md:col-span-1">
          <Label htmlFor={`record-columns-${block.id}`}>Columns</Label>
          <Input
            id={`record-columns-${block.id}`}
            onChange={(event) =>
              updateDisplay({
                columns: event.target.value
                  .split(",")
                  .map((column) => column.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Leave blank for all columns"
            value={block.display.columns.join(", ")}
          />
        </Field>
      </div>
    </div>
  );
}

function ReportBlockForm({
  block,
  onChange,
  reports,
}: {
  block: ReportBlockDraft;
  onChange: (block: ReportBlockDraft) => void;
  reports?: ReportRecord[];
}) {
  const update = (updates: Partial<ReportBlockDraft>) => {
    onChange({
      ...block,
      ...updates,
    });
  };

  const updateDisplay = (updates: Partial<ReportBlockDraft["display"]>) => {
    update({
      display: {
        ...block.display,
        ...updates,
      },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <h4 className="font-semibold text-base text-foreground">
        Report configuration
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`report-id-${block.id}`}>Report</Label>
          <Select
            disabled={!reports?.length}
            onValueChange={(value) => update({ reportId: value })}
            value={block.reportId}
          >
            <SelectTrigger id={`report-id-${block.id}`}>
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
          <Label htmlFor={`report-chart-${block.id}`}>Chart type</Label>
          <Select
            onValueChange={(value) =>
              updateDisplay({
                chartType: value as ReportBlockDraft["display"]["chartType"],
              })
            }
            value={block.display.chartType}
          >
            <SelectTrigger id={`report-chart-${block.id}`}>
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
      <Field>
        <Label htmlFor={`report-title-${block.id}`}>Title</Label>
        <Input
          id={`report-title-${block.id}`}
          onChange={(event) => updateDisplay({ title: event.target.value })}
          placeholder="Sales summary"
          value={block.display.title}
        />
      </Field>
    </div>
  );
}

function TriggerBlockForm({
  block,
  onChange,
}: {
  block: TriggerBlockDraft;
  onChange: (block: TriggerBlockDraft) => void;
}) {
  const updateDisplay = (updates: Partial<TriggerBlockDraft["display"]>) => {
    onChange({
      ...block,
      display: {
        ...block.display,
        ...updates,
      },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <h4 className="font-semibold text-base text-foreground">
        Trigger configuration
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`trigger-text-${block.id}`}>Button label</Label>
          <Input
            id={`trigger-text-${block.id}`}
            onChange={(event) =>
              updateDisplay({ buttonText: event.target.value })
            }
            placeholder="Delete record"
            value={block.display.buttonText}
          />
        </Field>
        <Field>
          <Label htmlFor={`trigger-action-${block.id}`}>Action style</Label>
          <Select
            onValueChange={(value) =>
              updateDisplay({
                actionType: value as TriggerBlockDraft["display"]["actionType"],
              })
            }
            value={block.display.actionType}
          >
            <SelectTrigger id={`trigger-action-${block.id}`}>
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_ACTION_TYPES.map((actionType) => (
                <SelectItem key={actionType} value={actionType}>
                  {actionType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <CheckboxField
        checked={block.display.requireConfirmation}
        id={`trigger-confirmation-${block.id}`}
        label="Require confirmation"
        onChange={(checked) => updateDisplay({ requireConfirmation: checked })}
      />
      {block.display.requireConfirmation ? (
        <Field>
          <Label htmlFor={`trigger-confirm-${block.id}`}>
            Confirmation message
          </Label>
          <Textarea
            id={`trigger-confirm-${block.id}`}
            onChange={(event) =>
              updateDisplay({ confirmationText: event.target.value })
            }
            rows={3}
            value={block.display.confirmationText}
          />
        </Field>
      ) : null}
      <Field>
        <Label htmlFor={`trigger-hook-${block.id}`}>Hook name</Label>
        <Input
          id={`trigger-hook-${block.id}`}
          onChange={(event) => updateDisplay({ hookName: event.target.value })}
          placeholder="delete_record"
          value={block.display.hookName}
        />
      </Field>
    </div>
  );
}

function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        checked={checked}
        className="h-4 w-4 rounded border border-input"
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <Label className="font-medium text-foreground text-sm" htmlFor={id}>
        {label}
      </Label>
    </div>
  );
}

function Field({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border/60 border-dashed p-6 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

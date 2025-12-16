"use client";

import { useMemo } from "react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LIST_DISPLAY_FORMATS,
  LIST_FILTER_OPERATORS,
  type ListBlockDraft,
  type ListBlockFilter,
  type ListFilterOperator,
  RECORD_DISPLAY_FORMATS,
  RECORD_DISPLAY_MODES,
  REPORT_CHART_TYPES,
  type RecordBlockDraft,
  type ReportBlockDraft,
  type TriggerBlockDraft,
  TRIGGER_ACTION_TYPES,
} from "./types";
import type { ReportRecord } from "@/lib/server/reports";
import { cn } from "@/lib/utils";

export function ListBlockForm({
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

  const handleFilterUpdate = (filterId: string, updates: Partial<ListBlockFilter>) => {
    update({
      filters: filters.map((filter) => (filter.id === filterId ? { ...filter, ...updates } : filter)),
    });
  };

  const handleAddFilter = () => {
    update({
      filters: [
        ...filters,
        {
          id: nanoid(10),
          column: "",
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
      <h4 className="text-base font-semibold text-foreground">List configuration</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`list-table-${block.id}`}>Table</Label>
          <Input
            id={`list-table-${block.id}`}
            value={block.tableName}
            onChange={(event) => update({ tableName: event.target.value })}
            placeholder="customers"
          />
        </Field>
        <Field>
          <Label htmlFor={`list-format-${block.id}`}>Display format</Label>
          <Select
            value={block.display.format}
            onValueChange={(value) =>
              updateDisplay({
                format: value as ListBlockDraft["display"]["format"],
              })
            }
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
          id={`list-actions-${block.id}`}
          label="Show row actions"
          checked={block.display.showActions}
          onChange={(checked) => updateDisplay({ showActions: checked })}
        />
        <CheckboxField
          id={`list-editable-${block.id}`}
          label="Inline editable"
          checked={block.display.editable}
          onChange={(checked) => updateDisplay({ editable: checked })}
        />
        <Field>
          <Label htmlFor={`list-columns-${block.id}`}>Visible columns</Label>
          <Input
            id={`list-columns-${block.id}`}
            value={block.display.columns.join(", ")}
            onChange={(event) =>
              updateDisplay({
                columns: event.target.value
                  .split(",")
                  .map((column) => column.trim())
                  .filter(Boolean),
              })
            }
            placeholder="id, email, status"
          />
        </Field>
      </div>

      <div>
        <h5 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Table Features</h5>
        <div className="grid gap-4 md:grid-cols-3">
          <CheckboxField
            id={`list-search-${block.id}`}
            label="Enable search"
            checked={block.display.enableSearch ?? true}
            onChange={(checked) => updateDisplay({ enableSearch: checked })}
          />
          <CheckboxField
            id={`list-row-selection-${block.id}`}
            label="Row selection"
            checked={block.display.enableRowSelection ?? false}
            onChange={(checked) => updateDisplay({ enableRowSelection: checked })}
          />
          <CheckboxField
            id={`list-sticky-header-${block.id}`}
            label="Sticky headers"
            checked={block.display.enableStickyHeader ?? true}
            onChange={(checked) => updateDisplay({ enableStickyHeader: checked })}
          />
          <CheckboxField
            id={`list-column-visibility-${block.id}`}
            label="Column visibility toggle"
            checked={block.display.enableColumnVisibility ?? false}
            onChange={(checked) => updateDisplay({ enableColumnVisibility: checked })}
          />
          <CheckboxField
            id={`list-column-resize-${block.id}`}
            label="Column resizing"
            checked={block.display.enableColumnResize ?? false}
            onChange={(checked) => updateDisplay({ enableColumnResize: checked })}
          />
          <CheckboxField
            id={`list-column-pin-${block.id}`}
            label="Column pinning"
            checked={block.display.enableColumnPin ?? false}
            onChange={(checked) => updateDisplay({ enableColumnPin: checked })}
          />
          <CheckboxField
            id={`list-column-drag-${block.id}`}
            label="Column reordering"
            checked={block.display.enableColumnDrag ?? false}
            onChange={(checked) => updateDisplay({ enableColumnDrag: checked })}
          />
          <Field>
            <Label htmlFor={`list-page-size-${block.id}`}>Page size</Label>
            <Input
              id={`list-page-size-${block.id}`}
              type="number"
              min={1}
              max={100}
              value={block.display.defaultPageSize ?? 10}
              onChange={(event) =>
                updateDisplay({
                  defaultPageSize: Number.parseInt(event.target.value, 10) || 10,
                })
              }
              placeholder="10"
            />
          </Field>
          <Field>
            <Label htmlFor={`list-search-placeholder-${block.id}`}>Search placeholder</Label>
            <Input
              id={`list-search-placeholder-${block.id}`}
              value={block.display.searchPlaceholder ?? ""}
              onChange={(event) =>
                updateDisplay({
                  searchPlaceholder: event.target.value || undefined,
                })
              }
              placeholder="Search..."
            />
          </Field>
        </div>
      </div>

      <div>
        <header className="flex items-center justify-between">
          <h5 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filters</h5>
          <Button type="button" variant="outline" onClick={handleAddFilter}>
            Add filter
          </Button>
        </header>
        <div className="mt-3 flex flex-col gap-3">
          {filters.length === 0 ? (
            <EmptyState message="No filters applied." />
          ) : (
            filters.map((filter) => (
              <div
                key={filter.id}
                className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-[1fr,1fr,1fr,auto]"
              >
                <Field>
                  <Label htmlFor={`filter-column-${filter.id}`}>Column</Label>
                  <Input
                    id={`filter-column-${filter.id}`}
                    value={filter.column}
                    onChange={(event) =>
                      handleFilterUpdate(filter.id, {
                        column: event.target.value,
                      })
                    }
                    placeholder="customer_id"
                  />
                </Field>
                <Field>
                  <Label htmlFor={`filter-operator-${filter.id}`}>Operator</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(value) =>
                      handleFilterUpdate(filter.id, {
                        operator: value as ListFilterOperator,
                      })
                    }
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
                    value={filter.value}
                    onChange={(event) =>
                      handleFilterUpdate(filter.id, {
                        value: event.target.value,
                      })
                    }
                    placeholder="url.customerId"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  className="self-end text-red-500 hover:text-red-500"
                  onClick={() => handleRemoveFilter(filter.id)}
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

export function RecordBlockForm({
  block,
  onChange,
  tableOptions,
  tablesLoading,
}: {
  block: RecordBlockDraft;
  onChange: (block: RecordBlockDraft) => void;
  tableOptions?: string[];
  tablesLoading?: boolean;
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
      <h4 className="text-base font-semibold text-foreground">Record configuration</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`record-table-${block.id}`}>Table</Label>
          {tableOptions && tableOptions.length > 0 ? (
            <Select
              value={block.tableName}
              onValueChange={(value) => update({ tableName: value })}
              disabled={tablesLoading}
            >
              <SelectTrigger id={`record-table-${block.id}`}>
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {tableOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`record-table-${block.id}`}
              value={block.tableName}
              onChange={(event) => update({ tableName: event.target.value })}
              placeholder="customers"
            />
          )}
        </Field>
        <Field>
          <Label htmlFor={`record-id-${block.id}`}>Record ID</Label>
          <Input
            id={`record-id-${block.id}`}
            value={block.recordId}
            onChange={(event) => update({ recordId: event.target.value })}
            placeholder="url.customerId"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field>
          <Label htmlFor={`record-mode-${block.id}`}>Mode</Label>
          <Select
            value={block.display.mode}
            onValueChange={(value) =>
              updateDisplay({
                mode: value as RecordBlockDraft["display"]["mode"],
              })
            }
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
            value={block.display.format}
            onValueChange={(value) =>
              updateDisplay({
                format: value as RecordBlockDraft["display"]["format"],
              })
            }
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
            value={block.display.columns.join(", ")}
            onChange={(event) =>
              updateDisplay({
                columns: event.target.value
                  .split(",")
                  .map((column) => column.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Leave blank for all columns"
          />
        </Field>
      </div>
    </div>
  );
}

export function ReportBlockForm({
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
      <h4 className="text-base font-semibold text-foreground">Report configuration</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`report-id-${block.id}`}>Report</Label>
          <Select
            value={block.reportId}
            onValueChange={(value) => update({ reportId: value })}
            disabled={!reports?.length}
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
            value={block.display.chartType}
            onValueChange={(value) =>
              updateDisplay({
                chartType: value as ReportBlockDraft["display"]["chartType"],
              })
            }
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
          value={block.display.title}
          onChange={(event) => updateDisplay({ title: event.target.value })}
          placeholder="Sales summary"
        />
      </Field>
    </div>
  );
}

export function TriggerBlockForm({
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
      <h4 className="text-base font-semibold text-foreground">Trigger configuration</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`trigger-text-${block.id}`}>Button label</Label>
          <Input
            id={`trigger-text-${block.id}`}
            value={block.display.buttonText}
            onChange={(event) => updateDisplay({ buttonText: event.target.value })}
            placeholder="Delete record"
          />
        </Field>
        <Field>
          <Label htmlFor={`trigger-action-${block.id}`}>Action style</Label>
          <Select
            value={block.display.actionType}
            onValueChange={(value) =>
              updateDisplay({
                actionType: value as TriggerBlockDraft["display"]["actionType"],
              })
            }
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
        id={`trigger-confirmation-${block.id}`}
        label="Require confirmation"
        checked={block.display.requireConfirmation}
        onChange={(checked) => updateDisplay({ requireConfirmation: checked })}
      />
      {block.display.requireConfirmation ? (
        <Field>
          <Label htmlFor={`trigger-confirm-${block.id}`}>Confirmation message</Label>
          <Textarea
            id={`trigger-confirm-${block.id}`}
            value={block.display.confirmationText}
            onChange={(event) => updateDisplay({ confirmationText: event.target.value })}
            rows={3}
          />
        </Field>
      ) : null}
      <Field>
        <Label htmlFor={`trigger-hook-${block.id}`}>Hook name</Label>
        <Input
          id={`trigger-hook-${block.id}`}
          value={block.display.hookName}
          onChange={(event) => updateDisplay({ hookName: event.target.value })}
          placeholder="delete_record"
        />
      </Field>
    </div>
  );
}

export function CheckboxField({
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
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border border-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
    </div>
  );
}

export function Field({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}


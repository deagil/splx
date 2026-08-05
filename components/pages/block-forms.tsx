"use client";

import { nanoid } from "nanoid";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import type { ReportRecord } from "@/lib/server/reports";
import { cn } from "@/lib/utils";
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
  TRIGGER_ACTION_TYPES,
  type TriggerBlockDraft,
} from "./types";

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
      <h4 className="font-semibold text-base text-foreground">
        Record configuration
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor={`record-table-${block.id}`}>Table</Label>
          {tableOptions && tableOptions.length > 0 ? (
            <Select
              disabled={tablesLoading}
              onValueChange={(value) => update({ tableName: value })}
              value={block.tableName}
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
              onChange={(event) => update({ tableName: event.target.value })}
              placeholder="customers"
              value={block.tableName}
            />
          )}
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

export function Field({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border/60 border-dashed p-6 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

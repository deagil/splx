import type { PageRecord } from "@/lib/server/pages";

export interface GridPosition {
  height: number;
  width: number;
  x: number;
  y: number;
}

export type ListFilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "is_null"
  | "is_not_null";

export const LIST_FILTER_OPERATORS: readonly ListFilterOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "is_null",
  "is_not_null",
];

export interface ListBlockFilter {
  column: string;
  id: string;
  operator: ListFilterOperator;
  value: string;
}

export type ListDisplayFormat = "table" | "cards" | "grid";
export const LIST_DISPLAY_FORMATS: readonly ListDisplayFormat[] = [
  "table",
  "cards",
  "grid",
];
export type RecordDisplayMode = "read" | "edit" | "create";
export const RECORD_DISPLAY_MODES: readonly RecordDisplayMode[] = [
  "read",
  "edit",
  "create",
];
export type RecordDisplayFormat = "table" | "form";
export const RECORD_DISPLAY_FORMATS: readonly RecordDisplayFormat[] = [
  "table",
  "form",
];
export type TriggerActionType = "default" | "destructive" | "primary";
export const TRIGGER_ACTION_TYPES: readonly TriggerActionType[] = [
  "default",
  "destructive",
  "primary",
];
export type ReportChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "radar";
export const REPORT_CHART_TYPES: readonly ReportChartType[] = [
  "bar",
  "line",
  "area",
  "pie",
  "donut",
  "radar",
];

export interface ListBlockDraft {
  display: {
    format: ListDisplayFormat;
    showActions: boolean;
    editable: boolean;
    columns: string[];
    enableSearch?: boolean;
    enableColumnVisibility?: boolean;
    enableColumnResize?: boolean;
    enableColumnPin?: boolean;
    enableColumnDrag?: boolean;
    enableRowSelection?: boolean;
    enableStickyHeader?: boolean;
    enableActions?: boolean;
    defaultPageSize?: number;
    searchPlaceholder?: string;
  };
  filters: ListBlockFilter[];
  id: string;
  position: GridPosition;
  tableName: string;
  type: "list";
}

export interface RecordBlockDraft {
  display: {
    mode: RecordDisplayMode;
    format: RecordDisplayFormat;
    columns: string[];
  };
  id: string;
  position: GridPosition;
  recordId: string;
  tableName: string;
  type: "record";
}

export interface ReportBlockDraft {
  display: {
    chartType: ReportChartType;
    title: string;
  };
  id: string;
  position: GridPosition;
  reportId: string;
  type: "report";
}

export interface TriggerBlockDraft {
  display: {
    buttonText: string;
    actionType: TriggerActionType;
    requireConfirmation: boolean;
    confirmationText: string;
    hookName: string;
  };
  id: string;
  position: GridPosition;
  type: "trigger";
}

export type PageBlockDraft =
  | ListBlockDraft
  | RecordBlockDraft
  | ReportBlockDraft
  | TriggerBlockDraft;

export interface PageUrlParamDraft {
  description?: string;
  id: string;
  name: string;
  required: boolean;
}

export interface PageDraft {
  blocks: PageBlockDraft[];
  description: string | null;
  id: string;
  layout: Record<string, unknown>;
  name: string;
  settings: {
    urlParams: PageUrlParamDraft[];
    hideHeader?: boolean;
    [key: string]: unknown;
  };
}

export interface PageSavePayload {
  blocks: PageRecord["blocks"];
  description: string | null;
  id: string;
  layout: PageRecord["layout"];
  name: string;
  settings: PageRecord["settings"];
}

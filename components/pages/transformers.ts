import { nanoid } from "nanoid";
import type { PageBlock, PageRecord } from "@/lib/server/pages";
import type {
  GridPosition,
  ListBlockDraft,
  ListBlockFilter,
  ListDisplayFormat,
  ListFilterOperator,
  PageBlockDraft,
  PageDraft,
  PageSavePayload,
  PageUrlParamDraft,
  RecordBlockDraft,
  RecordDisplayFormat,
  RecordDisplayMode,
  ReportBlockDraft,
  ReportChartType,
  TriggerActionType,
  TriggerBlockDraft,
} from "./types";

const filterColumnKeyRegex = /^filter\[(.+)]$/;

const DEFAULT_POSITION: GridPosition = {
  height: 4,
  width: 12,
  x: 0,
  y: 0,
};

const LIST_FORMATS: ListDisplayFormat[] = ["table", "cards", "grid"];
const RECORD_FORMATS: RecordDisplayFormat[] = ["table", "form"];
const RECORD_MODES: RecordDisplayMode[] = ["read", "edit", "create"];
const REPORT_CHARTS: ReportChartType[] = [
  "bar",
  "line",
  "area",
  "pie",
  "donut",
  "radar",
];
const TRIGGER_ACTIONS: TriggerActionType[] = [
  "default",
  "destructive",
  "primary",
];
const LIST_OPERATORS: ListFilterOperator[] = [
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

export function pageRecordToDraft(page: PageRecord): PageDraft {
  return {
    blocks: (page.blocks ?? []).map(normalizeBlock),
    description: page.description,
    id: page.id,
    layout: page.layout ?? {},
    name: page.name,
    settings: {
      ...page.settings,
      urlParams: normalizeUrlParams(page.settings?.urlParams),
    },
  };
}

export function draftToSavePayload(draft: PageDraft): PageSavePayload {
  return {
    blocks: draft.blocks.map(serializeBlock),
    description: draft.description,
    id: draft.id,
    layout: draft.layout,
    name: draft.name,
    settings: {
      ...draft.settings,
      urlParams: draft.settings.urlParams.map((param) => ({
        description: param.description ?? undefined,
        name: param.name,
        required: param.required,
      })),
    },
  };
}

function normalizeUrlParams(params: unknown): PageUrlParamDraft[] {
  if (!Array.isArray(params)) {
    return [];
  }

  return params
    .map((param): PageUrlParamDraft | null => {
      if (!param || typeof param !== "object") {
        return null;
      }
      const record = param as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "";
      if (!name) {
        return null;
      }
      const required =
        typeof record.required === "boolean" ? record.required : false;
      const description =
        typeof record.description === "string" ? record.description : undefined;
      return {
        description,
        id: nanoid(8),
        name,
        required,
      };
    })
    .filter((param): param is PageUrlParamDraft => param !== null);
}

function normalizeBlock(block: unknown): PageBlockDraft {
  if (!block || typeof block !== "object") {
    return createDefaultListBlock();
  }

  const record = block as Record<string, unknown>;
  const id =
    typeof record.id === "string" && record.id
      ? record.id
      : `block-${nanoid(6)}`;
  const { type } = record;

  switch (type) {
    case "list":
      return normalizeListBlock(id, record);
    case "record":
      return normalizeRecordBlock(id, record);
    case "report":
      return normalizeReportBlock(id, record);
    case "trigger":
      return normalizeTriggerBlock(id, record);
    default:
      return createDefaultListBlock(id);
  }
}

function normalizeListBlock(
  id: string,
  block: Record<string, unknown>
): ListBlockDraft {
  const dataSource = (block.dataSource ?? {}) as Record<string, unknown>;
  const displayConfig = (block.displayConfig ?? {}) as Record<string, unknown>;

  const tableName =
    typeof dataSource.tableName === "string" ? dataSource.tableName : "";

  const filtersObj = (dataSource.filters ?? {}) as Record<
    string,
    { operator?: string; value?: unknown }
  >;

  const filters = Object.entries(filtersObj).map<ListBlockFilter>(
    ([rawKey, filterConfig]) => ({
      column: parseFilterColumn(rawKey),
      id: nanoid(10),
      operator: parseListOperator(filterConfig.operator),
      value: inferFilterValue(filterConfig.value),
    })
  );

  const format = parseListFormat(displayConfig.format);
  const showActions =
    typeof displayConfig.showActions === "boolean"
      ? displayConfig.showActions
      : true;
  const editable =
    typeof displayConfig.editable === "boolean"
      ? displayConfig.editable
      : false;
  const columns = Array.isArray(displayConfig.columns)
    ? displayConfig.columns.filter(
        (column): column is string =>
          typeof column === "string" && column.length > 0
      )
    : [];

  // Parse new table feature flags
  const enableSearch =
    typeof displayConfig.enableSearch === "boolean"
      ? displayConfig.enableSearch
      : undefined;
  const enableColumnVisibility =
    typeof displayConfig.enableColumnVisibility === "boolean"
      ? displayConfig.enableColumnVisibility
      : undefined;
  const enableColumnResize =
    typeof displayConfig.enableColumnResize === "boolean"
      ? displayConfig.enableColumnResize
      : undefined;
  const enableColumnPin =
    typeof displayConfig.enableColumnPin === "boolean"
      ? displayConfig.enableColumnPin
      : undefined;
  const enableColumnDrag =
    typeof displayConfig.enableColumnDrag === "boolean"
      ? displayConfig.enableColumnDrag
      : undefined;
  const enableRowSelection =
    typeof displayConfig.enableRowSelection === "boolean"
      ? displayConfig.enableRowSelection
      : undefined;
  const enableStickyHeader =
    typeof displayConfig.enableStickyHeader === "boolean"
      ? displayConfig.enableStickyHeader
      : undefined;
  const enableActions =
    typeof displayConfig.enableActions === "boolean"
      ? displayConfig.enableActions
      : undefined;
  const defaultPageSize =
    typeof displayConfig.defaultPageSize === "number"
      ? displayConfig.defaultPageSize
      : undefined;
  const searchPlaceholder =
    typeof displayConfig.searchPlaceholder === "string"
      ? displayConfig.searchPlaceholder
      : undefined;

  return {
    display: {
      columns,
      defaultPageSize,
      editable,
      enableActions,
      enableColumnDrag,
      enableColumnPin,
      enableColumnResize,
      enableColumnVisibility,
      enableRowSelection,
      enableSearch,
      enableStickyHeader,
      format,
      searchPlaceholder,
      showActions,
    },
    filters,
    id,
    position: normalizePosition(block.position),
    tableName,
    type: "list",
  };
}

function normalizeRecordBlock(
  id: string,
  block: Record<string, unknown>
): RecordBlockDraft {
  const dataSource = (block.dataSource ?? {}) as Record<string, unknown>;
  const displayConfig = (block.displayConfig ?? {}) as Record<string, unknown>;

  const tableName =
    typeof dataSource.tableName === "string" ? dataSource.tableName : "";
  const recordId =
    typeof dataSource.recordId === "string" ? dataSource.recordId : "";

  const mode = parseRecordMode(displayConfig.mode);
  const format = parseRecordFormat(displayConfig.format);
  const columns = Array.isArray(displayConfig.columns)
    ? displayConfig.columns.filter(
        (column): column is string =>
          typeof column === "string" && column.length > 0
      )
    : [];

  return {
    display: {
      columns,
      format,
      mode,
    },
    id,
    position: normalizePosition(block.position),
    recordId,
    tableName,
    type: "record",
  };
}

function normalizeReportBlock(
  id: string,
  block: Record<string, unknown>
): ReportBlockDraft {
  const dataSource = (block.dataSource ?? {}) as Record<string, unknown>;
  const displayConfig = (block.displayConfig ?? {}) as Record<string, unknown>;

  const reportId =
    typeof dataSource.reportId === "string" ? dataSource.reportId : "";
  const chartType = parseReportChart(displayConfig.chartType);
  const title =
    typeof displayConfig.title === "string" ? displayConfig.title : "";

  return {
    display: {
      chartType,
      title,
    },
    id,
    position: normalizePosition(block.position),
    reportId,
    type: "report",
  };
}

function normalizeTriggerBlock(
  id: string,
  block: Record<string, unknown>
): TriggerBlockDraft {
  const displayConfig = (block.displayConfig ?? {}) as Record<string, unknown>;

  const buttonText =
    typeof displayConfig.buttonText === "string"
      ? displayConfig.buttonText
      : "Run action";
  const actionType = parseTriggerAction(displayConfig.actionType);
  const requireConfirmation =
    typeof displayConfig.requireConfirmation === "boolean"
      ? displayConfig.requireConfirmation
      : false;
  const confirmationText =
    typeof displayConfig.confirmationText === "string"
      ? displayConfig.confirmationText
      : "Are you sure?";
  const hookName =
    typeof displayConfig.hookName === "string" ? displayConfig.hookName : "";

  return {
    display: {
      actionType,
      buttonText,
      confirmationText,
      hookName,
      requireConfirmation,
    },
    id,
    position: normalizePosition(block.position),
    type: "trigger",
  };
}

function createDefaultListBlock(id?: string): ListBlockDraft {
  return {
    display: {
      columns: [],
      editable: false,
      format: "table",
      showActions: true,
    },
    filters: [],
    id: id ?? `block-${nanoid(6)}`,
    position: { ...DEFAULT_POSITION },
    tableName: "",
    type: "list",
  };
}

function createDefaultRecordBlock(id?: string): RecordBlockDraft {
  return {
    display: {
      columns: [],
      format: "form",
      mode: "read",
    },
    id: id ?? `block-${nanoid(6)}`,
    position: { ...DEFAULT_POSITION },
    recordId: "",
    tableName: "",
    type: "record",
  };
}

function createDefaultReportBlock(id?: string): ReportBlockDraft {
  return {
    display: {
      chartType: "bar",
      title: "",
    },
    id: id ?? `block-${nanoid(6)}`,
    position: { ...DEFAULT_POSITION },
    reportId: "",
    type: "report",
  };
}

function createDefaultTriggerBlock(id?: string): TriggerBlockDraft {
  return {
    display: {
      actionType: "default",
      buttonText: "Run action",
      confirmationText: "Are you sure?",
      hookName: "",
      requireConfirmation: false,
    },
    id: id ?? `block-${nanoid(6)}`,
    position: { ...DEFAULT_POSITION },
    type: "trigger",
  };
}

function normalizePosition(position: unknown): GridPosition {
  if (!position || typeof position !== "object") {
    return { ...DEFAULT_POSITION };
  }

  const record = position as Record<string, unknown>;
  const x = parseIntOrDefault(record.x, 0);
  const y = parseIntOrDefault(record.y, 0);
  const width = clamp(parseIntOrDefault(record.width, 12), 1, 12);
  const height = clamp(parseIntOrDefault(record.height, 4), 1, 12);

  return { height, width, x, y };
}

function parseIntOrDefault(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseFilterColumn(rawKey: string): string {
  const match = filterColumnKeyRegex.exec(rawKey);
  if (match) {
    return match[1] ?? "";
  }
  return rawKey;
}

function parseListOperator(operator: unknown): ListFilterOperator {
  if (
    typeof operator === "string" &&
    (LIST_OPERATORS as string[]).includes(operator)
  ) {
    return operator as ListFilterOperator;
  }
  return "equals";
}

function inferFilterValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function parseListFormat(format: unknown): ListDisplayFormat {
  if (
    typeof format === "string" &&
    (LIST_FORMATS as string[]).includes(format)
  ) {
    return format as ListDisplayFormat;
  }
  return "table";
}

function parseRecordMode(mode: unknown): RecordDisplayMode {
  if (typeof mode === "string" && (RECORD_MODES as string[]).includes(mode)) {
    return mode as RecordDisplayMode;
  }
  return "read";
}

function parseRecordFormat(format: unknown): RecordDisplayFormat {
  if (
    typeof format === "string" &&
    (RECORD_FORMATS as string[]).includes(format)
  ) {
    return format as RecordDisplayFormat;
  }
  return "form";
}

function parseReportChart(chart: unknown): ReportChartType {
  if (
    typeof chart === "string" &&
    (REPORT_CHARTS as string[]).includes(chart)
  ) {
    return chart as ReportChartType;
  }
  return "bar";
}

function parseTriggerAction(action: unknown): TriggerActionType {
  if (
    typeof action === "string" &&
    (TRIGGER_ACTIONS as string[]).includes(action)
  ) {
    return action as TriggerActionType;
  }
  return "default";
}

function serializeBlock(block: PageBlockDraft): PageBlock {
  switch (block.type) {
    case "list":
      return serializeListBlock(block);
    case "record":
      return serializeRecordBlock(block);
    case "report":
      return serializeReportBlock(block);
    case "trigger":
      return serializeTriggerBlock(block);
    default:
      return serializeListBlock(createDefaultListBlock());
  }
}

function serializeListBlock(block: ListBlockDraft): PageBlock {
  const filters = block.filters.reduce<Record<string, unknown>>(
    (accumulator, filter) => {
      if (!filter.column) {
        return accumulator;
      }

      accumulator[`filter[${filter.column}]`] = {
        operator: filter.operator,
        value: filter.value,
      };
      return accumulator;
    },
    {}
  );

  return {
    dataSource: {
      filters,
      tableName: block.tableName,
      type: "table",
    },
    displayConfig: {
      columns: block.display.columns,
      defaultPageSize: block.display.defaultPageSize,
      editable: block.display.editable,
      enableActions: block.display.enableActions,
      enableColumnDrag: block.display.enableColumnDrag,
      enableColumnPin: block.display.enableColumnPin,
      enableColumnResize: block.display.enableColumnResize,
      enableColumnVisibility: block.display.enableColumnVisibility,
      enableRowSelection: block.display.enableRowSelection,
      enableSearch: block.display.enableSearch,
      enableStickyHeader: block.display.enableStickyHeader,
      format: block.display.format,
      searchPlaceholder: block.display.searchPlaceholder,
      showActions: block.display.showActions,
    },
    id: block.id,
    position: { ...block.position },
    type: "list",
  };
}

function serializeRecordBlock(block: RecordBlockDraft): PageBlock {
  return {
    dataSource: {
      recordId: block.recordId,
      tableName: block.tableName,
      type: "record",
    },
    displayConfig: {
      columns: block.display.columns,
      format: block.display.format,
      mode: block.display.mode,
    },
    id: block.id,
    position: { ...block.position },
    type: "record",
  };
}

function serializeReportBlock(block: ReportBlockDraft): PageBlock {
  return {
    dataSource: {
      reportId: block.reportId,
      type: "report",
    },
    displayConfig: {
      chartType: block.display.chartType,
      title: block.display.title,
    },
    id: block.id,
    position: { ...block.position },
    type: "report",
  };
}

function serializeTriggerBlock(block: TriggerBlockDraft): PageBlock {
  return {
    dataSource: {},
    displayConfig: {
      actionType: block.display.actionType,
      buttonText: block.display.buttonText,
      confirmationText: block.display.confirmationText,
      hookName: block.display.hookName,
      requireConfirmation: block.display.requireConfirmation,
    },
    id: block.id,
    position: { ...block.position },
    type: "trigger",
  };
}

export function createBlockDraft(type: PageBlockDraft["type"]): PageBlockDraft {
  switch (type) {
    case "list":
      return createDefaultListBlock();
    case "record":
      return createDefaultRecordBlock();
    case "report":
      return createDefaultReportBlock();
    case "trigger":
      return createDefaultTriggerBlock();
    default:
      return createDefaultListBlock();
  }
}

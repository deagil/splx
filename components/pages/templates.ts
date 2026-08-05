import type { ListBlockDraft, PageBlockDraft, PageDraft } from "./types";

export interface PageTemplate {
  blocks: PageBlockDraft[];
  description: string;
  id: string;
  name: string;
  preview: TemplateRow[];
  settings?: Partial<PageDraft["settings"]>;
}

export interface TemplateRow {
  columns: Array<{
    span: number;
    label?: string;
    variant?: "record" | "list" | "trigger" | "report";
  }>;
}

const defaultListBlock = (id: string, tableName: string): ListBlockDraft => ({
  display: {
    columns: [],
    editable: false,
    format: "table",
    showActions: true,
  },
  filters: [],
  id,
  position: { height: 4, width: 12, x: 0, y: 0 },
  tableName,
  type: "list",
});

const defaultRecordBlock = (
  id: string,
  tableName: string,
  recordId: string
): PageBlockDraft => ({
  display: {
    columns: [],
    format: "form",
    mode: "read",
  },
  id,
  position: { height: 6, width: 12, x: 0, y: 0 },
  recordId,
  tableName,
  type: "record",
});

export const pageTemplates: PageTemplate[] = [
  {
    blocks: [
      defaultRecordBlock("record-detail", "records", "url.id"),
      {
        ...defaultListBlock("audit-log", "audit_logs"),
        filters: [
          {
            column: "record_id",
            id: "audit-filter",
            operator: "equals",
            value: "url.id",
          },
        ],
        position: { height: 4, width: 6, x: 0, y: 1 },
      },
      {
        ...defaultListBlock("workflow-runs", "workflow_runs"),
        filters: [
          {
            column: "record_id",
            id: "runs-filter",
            operator: "equals",
            value: "url.id",
          },
        ],
        position: { height: 4, width: 6, x: 6, y: 1 },
      },
    ],
    description:
      "Record details with audit log and workflow runs filtered to the current record.",
    id: "detail-view",
    name: "Detail view",
    preview: [
      { columns: [{ label: "Record", span: 12, variant: "record" }] },
      {
        columns: [
          { label: "Audit log", span: 6, variant: "list" },
          { label: "Runs", span: 6, variant: "list" },
        ],
      },
    ],
    settings: {
      urlParams: [
        {
          description: "Record identifier",
          id: "param-id",
          name: "id",
          required: true,
        },
      ],
    },
  },
  {
    blocks: [defaultListBlock("primary-list", "records")],
    description: "Single, full-width table for browsing a dataset.",
    id: "list-view",
    name: "List view",
    preview: [{ columns: [{ label: "Table", span: 12, variant: "list" }] }],
  },
  {
    blocks: [
      {
        ...defaultListBlock("runs", "workflow_runs"),
        position: { height: 6, width: 8, x: 0, y: 0 },
      },
      {
        display: {
          actionType: "primary",
          buttonText: "Run workflow",
          confirmationText: "",
          hookName: "run_workflow",
          requireConfirmation: false,
        },
        id: "trigger-panel",
        position: { height: 6, width: 4, x: 8, y: 0 },
        type: "trigger",
      },
    ],
    description:
      "List of workflow runs with a trigger panel for quick actions.",
    id: "action-dashboard",
    name: "Action dashboard",
    preview: [
      {
        columns: [
          { label: "Runs", span: 8, variant: "list" },
          { label: "Trigger", span: 4, variant: "trigger" },
        ],
      },
    ],
  },
  {
    blocks: [
      {
        ...defaultListBlock("master-list", "records"),
        position: { height: 8, width: 5, x: 0, y: 0 },
      },
      {
        ...defaultRecordBlock("detail-panel", "records", "url.id"),
        position: { height: 8, width: 7, x: 5, y: 0 },
      },
    ],
    description:
      "Left column list for browsing, right column record details for the selection.",
    id: "master-detail",
    name: "Master-detail",
    preview: [
      {
        columns: [
          { label: "List", span: 5, variant: "list" },
          { label: "Record", span: 7, variant: "record" },
        ],
      },
    ],
    settings: {
      urlParams: [
        {
          description: "Record identifier",
          id: "param-master-id",
          name: "id",
          required: true,
        },
      ],
    },
  },
  {
    blocks: [
      {
        ...defaultListBlock("kpi-one", "metrics"),
        id: "kpi-one",
        position: { height: 2, width: 4, x: 0, y: 0 },
      },
      {
        ...defaultListBlock("kpi-two", "metrics"),
        id: "kpi-two",
        position: { height: 2, width: 4, x: 4, y: 0 },
      },
      {
        ...defaultListBlock("kpi-three", "metrics"),
        id: "kpi-three",
        position: { height: 2, width: 4, x: 8, y: 0 },
      },
      {
        display: {
          chartType: "line",
          title: "Performance",
        },
        id: "report-chart",
        position: { height: 6, width: 8, x: 0, y: 2 },
        reportId: "report-1",
        type: "report",
      },
      {
        ...defaultListBlock("recent-activity", "activity_log"),
        position: { height: 6, width: 4, x: 8, y: 2 },
      },
    ],
    description: "Combination of KPIs, chart, and recent activity feed.",
    id: "reporting",
    name: "Reporting overview",
    preview: [
      {
        columns: [
          { label: "Report", span: 4, variant: "report" },
          { label: "Report", span: 4, variant: "report" },
          { label: "Report", span: 4, variant: "report" },
        ],
      },
      {
        columns: [
          { label: "Chart", span: 8, variant: "report" },
          { label: "List", span: 4, variant: "list" },
        ],
      },
    ],
  },
];

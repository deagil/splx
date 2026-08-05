"use client";

import {
  ActionBadge,
  ActivityLogView,
  formatRelative,
  formatTimestamp,
  JsonBlock,
  type LogEntry,
  MonoCell,
} from "./activity-log-view";

function actor(entry: LogEntry): string {
  return (
    (entry.actorName as string | null) ??
    (entry.actorEmail as string | null) ??
    (entry.actorUserId ? "Unknown user" : "System")
  );
}

export function AuditLogView() {
  return (
    <ActivityLogView
      columns={[
        {
          key: "createdAt",
          header: "When",
          className: "w-44",
          render: (entry) => (
            <span title={formatTimestamp(entry.createdAt)}>
              {formatRelative(entry.createdAt)}
            </span>
          ),
        },
        {
          key: "action",
          header: "Action",
          className: "w-56",
          render: (entry) => <ActionBadge value={entry.action as string} />,
        },
        {
          key: "resourceType",
          header: "Resource",
          render: (entry) => (
            <div className="flex flex-col">
              <span className="text-sm">{entry.resourceType as string}</span>
              <MonoCell value={entry.resourceId} />
            </div>
          ),
        },
        {
          key: "actor",
          header: "Actor",
          render: (entry) => <span className="text-sm">{actor(entry)}</span>,
        },
      ]}
      detailFields={[
        {
          label: "Action",
          render: (entry) => <ActionBadge value={entry.action as string} />,
        },
        {
          label: "Resource type",
          render: (entry) => <MonoCell value={entry.resourceType} />,
        },
        {
          label: "Resource id",
          render: (entry) => <MonoCell value={entry.resourceId} />,
        },
        {
          label: "Actor",
          render: (entry) => (
            <div className="flex flex-col gap-0.5">
              <span>{actor(entry)}</span>
              <MonoCell value={entry.actorUserId} />
            </div>
          ),
        },
        {
          label: "Request id",
          render: (entry) => <MonoCell value={entry.requestId} />,
        },
        {
          label: "Timestamp",
          render: (entry) => (
            <span className="text-sm">{formatTimestamp(entry.createdAt)}</span>
          ),
        },
        {
          label: "Changes",
          render: (entry) => <JsonBlock value={entry.changes} />,
        },
      ]}
      detailTitle={(entry) => entry.action as string}
      emptyMessage="No audit entries yet. Mutations made through /api/v1 will appear here."
      endpoint="/api/v1/audit-logs"
    />
  );
}

"use client";

import {
  ActivityLogView,
  formatRelative,
  formatTimestamp,
  JsonBlock,
  MonoCell,
} from "./activity-log-view";

export function EventsView() {
  return (
    <ActivityLogView
      columns={[
        {
          className: "w-44",
          header: "When",
          key: "createdAt",
          render: (entry) => (
            <span title={formatTimestamp(entry.createdAt)}>
              {formatRelative(entry.createdAt)}
            </span>
          ),
        },
        {
          header: "Event",
          key: "eventName",
          render: (entry) => (
            <span className="font-mono text-xs">
              {entry.eventName as string}
            </span>
          ),
        },
        {
          className: "w-48",
          header: "Actor",
          key: "actorEmail",
          render: (entry) => (
            <span className="text-sm">
              {(entry.actorEmail as string | null) ??
                (entry.actorUserId ? "Unknown user" : "System")}
            </span>
          ),
        },
      ]}
      detailFields={[
        {
          label: "Event",
          render: (entry) => <MonoCell value={entry.eventName} />,
        },
        {
          label: "Actor",
          render: (entry) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">
                {(entry.actorEmail as string | null) ??
                  (entry.actorUserId ? "Unknown user" : "System")}
              </span>
              <MonoCell value={entry.actorUserId} />
            </div>
          ),
        },
        {
          label: "Caused by run",
          render: (entry) => <MonoCell value={entry.causedByRunId} />,
        },
        {
          label: "Request id",
          render: (entry) => <MonoCell value={entry.requestId} />,
        },
        {
          label: "Created",
          render: (entry) => (
            <span className="text-sm">{formatTimestamp(entry.createdAt)}</span>
          ),
        },
        {
          label: "Payload",
          render: (entry) => <JsonBlock value={entry.payload} />,
        },
      ]}
      detailTitle={(entry) => entry.eventName as string}
      emptyMessage="No events yet. Row mutations emit db.<table>.created/updated/deleted."
      endpoint="/api/v1/events"
    />
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import {
  ActivityLogView,
  formatRelative,
  formatTimestamp,
  JsonBlock,
  type LogEntry,
  MonoCell,
} from "./activity-log-view";

function ProcessedBadge({ entry }: { entry: LogEntry }) {
  const processedAt = entry.processedAt as string | null;

  if (!processedAt) {
    return (
      <Badge appearance="light" variant="warning">
        Pending
      </Badge>
    );
  }

  return (
    <Badge appearance="light" variant="success">
      Processed
    </Badge>
  );
}

export function EventsView() {
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
          key: "eventName",
          header: "Event",
          render: (entry) => (
            <span className="font-mono text-xs">
              {entry.eventName as string}
            </span>
          ),
        },
        {
          key: "processedAt",
          header: "Status",
          className: "w-32",
          render: (entry) => <ProcessedBadge entry={entry} />,
        },
        {
          key: "attempts",
          header: "Attempts",
          className: "w-24",
          render: (entry) => (
            <span className="text-sm">{String(entry.attempts ?? 0)}</span>
          ),
        },
      ]}
      detailFields={[
        {
          label: "Event",
          render: (entry) => <MonoCell value={entry.eventName} />,
        },
        {
          label: "Status",
          render: (entry) => <ProcessedBadge entry={entry} />,
        },
        {
          label: "Processed at",
          render: (entry) =>
            entry.processedAt ? (
              <span className="text-sm">
                {formatTimestamp(entry.processedAt as string)}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">
                Not yet consumed
              </span>
            ),
        },
        {
          label: "Attempts",
          render: (entry) => (
            <span className="text-sm">{String(entry.attempts ?? 0)}</span>
          ),
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

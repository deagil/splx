"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { formatRelative } from "@/components/build/activity-log-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface EventType {
  description: string | null;
  id: string;
  name: string;
}

interface Workflow {
  description: string | null;
  enabled: boolean;
  eventName: string | null;
  id: string;
  name: string;
  steps: unknown[];
  triggerType: string;
  updatedAt: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body;
};

const DEFAULT_STEPS = `[
  {
    "type": "condition",
    "label": "Has record id",
    "input": {
      "left": "{{event.payload.record.id}}",
      "operator": "is_not_null"
    }
  }
]`;

export function ListenersView() {
  const {
    data: workflowsData,
    error,
    isLoading,
    mutate,
  } = useSWR("/api/v1/workflows", fetcher);
  const { data: typesData } = useSWR("/api/v1/event-types", fetcher);

  const workflows = (workflowsData?.data?.workflows ?? []) as Workflow[];
  const eventTypes = (typesData?.data?.eventTypes ?? []) as EventType[];

  const listeners = useMemo(
    () => workflows.filter((workflow) => workflow.triggerType === "event"),
    [workflows]
  );

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [eventName, setEventName] = useState("");
  const [stepsJson, setStepsJson] = useState(DEFAULT_STEPS);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createListener = async () => {
    setFormError(null);
    setSaving(true);
    try {
      let steps: unknown[];
      try {
        steps = JSON.parse(stepsJson);
      } catch (parseError) {
        throw new Error("Steps must be valid JSON", { cause: parseError });
      }

      const response = await fetch("/api/v1/workflows", {
        body: JSON.stringify({
          enabled: true,
          eventName,
          name,
          steps,
          triggerType: "event",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to create listener");
      }
      setCreating(false);
      setName("");
      setEventName("");
      await mutate();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (listener: Workflow) => {
    const response = await fetch(`/api/v1/workflows/${listener.id}`, {
      body: JSON.stringify({ enabled: !listener.enabled }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    if (!response.ok) {
      const body = await response.json();
      setFormError(body?.error ?? "Failed to update");
      return;
    }
    await mutate();
  };

  const runNow = async (listener: Workflow) => {
    const response = await fetch(`/api/v1/workflows/${listener.id}/run`, {
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      const body = await response.json();
      setFormError(body?.error ?? "Failed to run");
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load listeners: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {listeners.length} listener{listeners.length === 1 ? "" : "s"} binding
          events to workflows
        </p>
        <Button
          onClick={() => setCreating(true)}
          type="button"
          variant="primary"
        >
          New listener
        </Button>
      </div>

      {creating ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="font-medium text-sm">Bind an event to a workflow</h2>
          <Input
            onChange={(event) => setName(event.target.value)}
            placeholder="Listener name"
            value={name}
          />
          <div className="space-y-1">
            <label className="font-medium text-sm" htmlFor="listener-event">
              Event type
            </label>
            <Input
              id="listener-event"
              list="event-type-options"
              onChange={(event) => setEventName(event.target.value)}
              placeholder="e.g. db.contacts.created or order.cancelled"
              value={eventName}
            />
            <datalist id="event-type-options">
              {eventTypes.map((eventType) => (
                <option key={eventType.id} value={eventType.name}>
                  {eventType.description ?? eventType.name}
                </option>
              ))}
            </datalist>
          </div>
          <Textarea
            className="min-h-36 font-mono text-xs"
            onChange={(event) => setStepsJson(event.target.value)}
            value={stepsJson}
          />
          {formError ? (
            <p className="text-destructive text-sm">{formError}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              disabled={saving || !name.trim() || !eventName.trim()}
              onClick={createListener}
              type="button"
            >
              Create
            </Button>
            <Button
              onClick={() => setCreating(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {formError && !creating ? (
        <p className="text-destructive text-sm">{formError}</p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Listens for</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-44">Updated</TableHead>
              <TableHead className="w-48" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listeners.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No listeners yet. Bind an event type to a workflow to enqueue
                  runs when that fact is emitted.
                </TableCell>
              </TableRow>
            ) : (
              listeners.map((listener) => (
                <TableRow key={listener.id}>
                  <TableCell className="font-medium">{listener.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {listener.eventName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      appearance="light"
                      variant={listener.enabled ? "success" : "secondary"}
                    >
                      {listener.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatRelative(listener.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        onClick={() => toggleEnabled(listener)}
                        type="button"
                        variant="outline"
                      >
                        {listener.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        onClick={() => runNow(listener)}
                        type="button"
                        variant="ghost"
                      >
                        Run
                      </Button>
                      <Button asChild type="button" variant="ghost">
                        <Link href={`/automation/workflows?id=${listener.id}`}>
                          Edit steps
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

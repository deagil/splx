"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
  formatRelative,
  formatTimestamp,
  JsonBlock,
} from "@/components/build/activity-log-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface Workflow {
  createdAt: string;
  description: string | null;
  enabled: boolean;
  eventName: string | null;
  id: string;
  name: string;
  steps: unknown[];
  triggerType: string;
  updatedAt: string;
}

interface WorkflowRun {
  error: string | null;
  finishedAt: string | null;
  id: string;
  startedAt: string;
  status: string;
  steps: unknown[];
  workflowId: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body;
};

const DEFAULT_STEPS_JSON = `[
  {
    "type": "condition",
    "label": "Only when found",
    "input": {
      "left": "{{event.payload.record.id}}",
      "operator": "is_not_null"
    }
  }
]`;

export function WorkflowsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/workflows",
    fetcher
  );
  const workflows = (data?.data?.workflows ?? []) as Workflow[];

  const selected = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedId) ?? null,
    [workflows, selectedId]
  );

  const { data: runsData, mutate: mutateRuns } = useSWR(
    selectedId
      ? `/api/v1/workflows/runs?workflowId=${selectedId}&limit=20`
      : null,
    fetcher
  );
  const runs = (runsData?.data?.entries ?? []) as WorkflowRun[];

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<"event" | "manual">("event");
  const [eventName, setEventName] = useState("db.contacts.created");
  const [stepsJson, setStepsJson] = useState(DEFAULT_STEPS_JSON);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editStepsJson, setEditStepsJson] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const selectWorkflow = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("id", id);
      } else {
        params.delete("id");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const openSelected = useCallback(
    (workflow: Workflow) => {
      setEditStepsJson(JSON.stringify(workflow.steps ?? [], null, 2));
      setEditEnabled(workflow.enabled);
      setEditError(null);
      selectWorkflow(workflow.id);
    },
    [selectWorkflow]
  );

  const createWorkflow = async () => {
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
          enabled: false,
          eventName: triggerType === "event" ? eventName : null,
          name,
          steps,
          triggerType,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to create workflow");
      }

      setCreating(false);
      setName("");
      await mutate();
      openSelected(body.data.workflow);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const saveWorkflow = async () => {
    if (!selected) {
      return;
    }
    setEditError(null);
    setSaving(true);
    try {
      let steps: unknown[];
      try {
        steps = JSON.parse(editStepsJson);
      } catch (parseError) {
        throw new Error("Steps must be valid JSON", { cause: parseError });
      }

      const response = await fetch(`/api/v1/workflows/${selected.id}`, {
        body: JSON.stringify({ enabled: editEnabled, steps }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to save workflow");
      }
      await mutate();
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runWorkflow = async () => {
    if (!selected) {
      return;
    }
    setEditError(null);
    const response = await fetch(`/api/v1/workflows/${selected.id}/run`, {
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = await response.json();
    if (!response.ok) {
      setEditError(body?.error ?? "Failed to run workflow");
      return;
    }
    await mutateRuns();
  };

  const deleteWorkflow = async () => {
    if (!selected) {
      return;
    }
    if (!window.confirm(`Delete workflow “${selected.name}”?`)) {
      return;
    }
    const response = await fetch(`/api/v1/workflows/${selected.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json();
      setEditError(body?.error ?? "Failed to delete");
      return;
    }
    selectWorkflow(null);
    await mutate();
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load workflows: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {workflows.length} workflow{workflows.length === 1 ? "" : "s"}
        </p>
        <Button
          onClick={() => setCreating(true)}
          type="button"
          variant="primary"
        >
          New workflow
        </Button>
      </div>

      {creating ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="font-medium text-sm">Create workflow</h2>
          <Input
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            value={name}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setTriggerType("event")}
              type="button"
              variant={triggerType === "event" ? "primary" : "outline"}
            >
              Event trigger
            </Button>
            <Button
              onClick={() => setTriggerType("manual")}
              type="button"
              variant={triggerType === "manual" ? "primary" : "outline"}
            >
              Manual
            </Button>
          </div>
          {triggerType === "event" ? (
            <Input
              onChange={(event) => setEventName(event.target.value)}
              placeholder="Event name, e.g. db.contacts.created"
              value={eventName}
            />
          ) : null}
          <Textarea
            className="min-h-40 font-mono text-xs"
            onChange={(event) => setStepsJson(event.target.value)}
            value={stepsJson}
          />
          {formError ? (
            <p className="text-destructive text-sm">{formError}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              disabled={saving || !name.trim()}
              onClick={createWorkflow}
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-44">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={4}>
                  No workflows yet. Create one to react to events or run from a
                  Trigger block.
                </TableCell>
              </TableRow>
            ) : (
              workflows.map((workflow) => (
                <TableRow
                  className="cursor-pointer"
                  key={workflow.id}
                  onClick={() => openSelected(workflow)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSelected(workflow);
                    }
                  }}
                  tabIndex={0}
                >
                  <TableCell className="font-medium">{workflow.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {workflow.triggerType === "event"
                      ? workflow.eventName
                      : "manual"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      appearance="light"
                      variant={workflow.enabled ? "success" : "secondary"}
                    >
                      {workflow.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell title={formatTimestamp(workflow.updatedAt)}>
                    {formatRelative(workflow.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            selectWorkflow(null);
          }
        }}
        open={Boolean(selected)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selected.id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4 px-1">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setEditEnabled((value) => !value)}
                    type="button"
                    variant="outline"
                  >
                    {editEnabled ? "Disable" : "Enable"}
                  </Button>
                  <Button onClick={runWorkflow} type="button" variant="primary">
                    Run now
                  </Button>
                  <Button
                    disabled={saving}
                    onClick={saveWorkflow}
                    type="button"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={deleteWorkflow}
                    type="button"
                    variant="destructive"
                  >
                    Delete
                  </Button>
                </div>

                <div>
                  <p className="mb-1 font-medium text-sm">Trigger</p>
                  <p className="font-mono text-xs">
                    {selected.triggerType === "event"
                      ? selected.eventName
                      : "manual"}
                  </p>
                </div>

                <div>
                  <p className="mb-1 font-medium text-sm">Steps (JSON)</p>
                  <Textarea
                    className="min-h-48 font-mono text-xs"
                    onChange={(event) => setEditStepsJson(event.target.value)}
                    value={editStepsJson}
                  />
                </div>

                {editError ? (
                  <p className="text-destructive text-sm">{editError}</p>
                ) : null}

                <div>
                  <p className="mb-2 font-medium text-sm">Recent runs</p>
                  {runs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No runs yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {runs.map((run) => (
                        <div
                          className="rounded-md border p-3 text-sm"
                          key={run.id}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              appearance="light"
                              variant={
                                run.status === "succeeded"
                                  ? "success"
                                  : run.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {run.status}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {formatRelative(run.startedAt)}
                            </span>
                          </div>
                          {run.error ? (
                            <p className="mt-2 text-destructive text-xs">
                              {run.error}
                            </p>
                          ) : null}
                          <div className="mt-2">
                            <JsonBlock value={run.steps} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

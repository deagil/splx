"use client";

import { useState } from "react";
import useSWR from "swr";
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

type EventType = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body;
};

export function AutomationEventsView() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/event-types",
    fetcher
  );
  const eventTypes = (data?.data?.eventTypes ?? []) as EventType[];

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createType = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/v1/event-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: description.trim() || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to create event type");
      }
      setAdding(false);
      setName("");
      setDescription("");
      await mutate();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const removeType = async (eventType: EventType) => {
    if (eventType.isSystem) {
      return;
    }
    if (!window.confirm(`Delete event type “${eventType.name}”?`)) {
      return;
    }
    const response = await fetch(`/api/v1/event-types/${eventType.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json();
      setFormError(body?.error ?? "Failed to delete");
      return;
    }
    await mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Event types</h2>
          <p className="text-muted-foreground text-sm">
            Named events Listeners can subscribe to. System patterns document
            `db.*` emissions; custom types are for product events you emit
            yourself.
          </p>
        </div>
        <Button
          onClick={() => setAdding(true)}
          type="button"
          variant="primary"
        >
          Add type
        </Button>
      </div>

      {adding ? (
        <div className="space-y-3 rounded-lg border p-4">
          <Input
            onChange={(event) => setName(event.target.value)}
            placeholder="Name, e.g. order.cancelled"
            value={name}
          />
          <Textarea
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
            value={description}
          />
          {formError ? (
            <p className="text-destructive text-sm">{formError}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              disabled={saving || !name.trim()}
              onClick={createType}
              type="button"
            >
              Create
            </Button>
            <Button
              onClick={() => setAdding(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28">Kind</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventTypes.map((eventType) => (
                <TableRow key={eventType.id}>
                  <TableCell className="font-mono text-xs">
                    {eventType.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {eventType.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      appearance="light"
                      variant={eventType.isSystem ? "secondary" : "success"}
                    >
                      {eventType.isSystem ? "System" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {eventType.isSystem ? null : (
                      <Button
                        onClick={() => removeType(eventType)}
                        type="button"
                        variant="ghost"
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

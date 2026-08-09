"use client";

/**
 * Template gallery. Cards rather than a table, because the useful thing to
 * recognise an email by is what it looks like — the thumbnails are the real
 * renderer at 0.32 scale, so they can't drift from the thing they preview.
 */

import {
  CopyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EMAIL_STARTERS } from "@/lib/comms/starters";
import type {
  EmailBlock,
  EmailTemplateStatus,
  EmailTemplateVariable,
} from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import { TemplateThumbnail } from "./template-thumbnail";

interface EmailTemplate {
  blocks: EmailBlock[];
  description: string | null;
  id: string;
  name: string;
  previewText: string | null;
  sampleData: Record<string, string>;
  slug: string;
  status: EmailTemplateStatus;
  subject: string;
  updatedAt: string;
  variables: EmailTemplateVariable[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body;
};

type StatusFilter = "active" | "all" | "draft";

export function TemplatesListView() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/email-templates",
    fetcher
  );
  const templates = (data?.data?.templates ?? []) as EmailTemplate[];

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EmailTemplate | null>(
    null
  );

  const visible =
    filter === "all"
      ? templates
      : templates.filter((template) => template.status === filter);

  const create = async (body: Record<string, unknown>) => {
    setFormError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/v1/email-templates", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create template");
      }
      await mutate();
      router.push(`/comms/templates/${payload.data.template.id}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = (template: EmailTemplate) =>
    create({
      blocks: template.blocks,
      description: template.description,
      name: `${template.name} copy`,
      previewText: template.previewText,
      sampleData: template.sampleData,
      subject: template.subject,
      variables: template.variables,
    });

  const remove = async (template: EmailTemplate) => {
    setPendingDelete(null);
    await fetch(`/api/v1/email-templates/${template.id}`, { method: "DELETE" });
    await mutate();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton className="h-64 w-full" key={key} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : "Failed to load templates"}
      </p>
    );
  }

  const showStarters = creating || templates.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5">
          {(["all", "draft", "active"] as const).map((option) => (
            <button
              className={cn(
                "rounded px-2.5 py-1 text-xs capitalize transition-colors",
                filter === option
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={option}
              onClick={() => setFilter(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        {templates.length > 0 ? (
          <Button
            onClick={() => setCreating((value) => !value)}
            type="button"
            variant={creating ? "outline" : "primary"}
          >
            {creating ? (
              "Cancel"
            ) : (
              <>
                <PlusIcon className="size-4" />
                New template
              </>
            )}
          </Button>
        ) : null}
      </div>

      {showStarters ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-medium text-sm">Start from a template</h2>
            <p className="text-muted-foreground text-sm">
              Pick a structure, then edit the copy directly on the email.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EMAIL_STARTERS.map((starter) => (
              <button
                className="group overflow-hidden rounded-lg border border-border text-left transition-shadow hover:shadow-md disabled:opacity-60"
                disabled={busy}
                key={starter.id}
                onClick={() =>
                  create({ starterId: starter.id, status: "draft" })
                }
                type="button"
              >
                <TemplateThumbnail
                  blocks={starter.blocks}
                  className="h-40 rounded-none border-0 border-border border-b"
                  variables={starter.variables}
                />
                <div className="p-3">
                  <p className="font-medium text-sm">{starter.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
                    {starter.description}
                  </p>
                </div>
              </button>
            ))}
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border border-dashed p-6 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
              disabled={busy}
              onClick={() =>
                create({
                  blocks: [
                    {
                      id: crypto.randomUUID(),
                      level: 1,
                      text: "Hello",
                      type: "heading",
                    },
                    {
                      id: crypto.randomUUID(),
                      text: "Write your message here.",
                      type: "text",
                    },
                  ],
                  name: "Untitled template",
                  status: "draft",
                  subject: "",
                })
              }
              type="button"
            >
              <PlusIcon className="size-5" />
              <span className="text-sm">Start blank</span>
            </button>
          </div>
          {formError ? (
            <p className="text-destructive text-sm">{formError}</p>
          ) : null}
        </section>
      ) : null}

      {visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <article
              className="group relative overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-md"
              key={template.id}
            >
              <Link
                aria-label={`Edit ${template.name}`}
                className="absolute inset-0 z-10"
                href={`/comms/templates/${template.id}`}
              />
              <TemplateThumbnail
                blocks={template.blocks}
                className="h-40 rounded-none border-0 border-border border-b"
                variables={template.variables}
              />
              <div className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {template.name}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {template.subject || "No subject yet"}
                  </p>
                </div>
                <Badge
                  variant={
                    template.status === "active" ? "primary" : "secondary"
                  }
                >
                  {template.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Actions for ${template.name}`}
                    className="relative z-20 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    type="button"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicate(template)}>
                      <CopyIcon className="size-3.5" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setPendingDelete(template)}
                      variant="destructive"
                    >
                      <Trash2Icon className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {templates.length > 0 && visible.length === 0 ? (
        <p className="rounded-lg border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
          No {filter} templates.
        </p>
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Workflows that send this template will fail after it is deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && void remove(pendingDelete)}
            >
              Delete template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

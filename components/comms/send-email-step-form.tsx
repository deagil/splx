"use client";

import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailTemplateVariable } from "@/lib/comms/types";

export interface SendEmailStepInput {
  mapping?: Record<string, string>;
  replyTo?: string;
  templateId?: string;
  to?: string;
}

interface ActiveTemplate {
  id: string;
  name: string;
  subject: string;
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

const PATH_HINTS = [
  "{{event.payload.record.email}}",
  "{{event.payload.record.id}}",
  "{{steps.0.output.id}}",
];

export function SendEmailStepForm({
  value,
  onChange,
}: {
  onChange: (next: SendEmailStepInput) => void;
  value: SendEmailStepInput;
}) {
  const { data, error, isLoading } = useSWR(
    "/api/v1/email-templates?status=active",
    fetcher
  );
  const templates = (data?.data?.templates ?? []) as ActiveTemplate[];
  const selected =
    templates.find((template) => template.id === value.templateId) ?? null;

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : "Failed to load templates"}
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-3">
      <div>
        <h3 className="font-medium text-sm">Send email</h3>
        <p className="text-muted-foreground text-xs">
          Choose an active template and map its required fields to event or step
          paths.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="send-email-template">Template</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="send-email-template"
          onChange={(event) => {
            const templateId = event.target.value || undefined;
            const nextTemplate = templates.find(
              (template) => template.id === templateId
            );
            const mapping: Record<string, string> = {};
            for (const variable of nextTemplate?.variables ?? []) {
              mapping[variable.key] = value.mapping?.[variable.key] ?? "";
            }
            onChange({
              ...value,
              mapping,
              templateId,
            });
          }}
          value={value.templateId ?? ""}
        >
          <option value="">Select a template…</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {templates.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No active templates. Activate one under Comms → Templates.
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="send-email-to">To</Label>
        <Input
          id="send-email-to"
          onChange={(event) => onChange({ ...value, to: event.target.value })}
          placeholder="{{event.payload.record.email}}"
          value={value.to ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="send-email-reply">Reply-to (optional)</Label>
        <Input
          id="send-email-reply"
          onChange={(event) =>
            onChange({ ...value, replyTo: event.target.value || undefined })
          }
          placeholder="Optional override"
          value={value.replyTo ?? ""}
        />
      </div>

      {selected ? (
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">Variable mapping</h4>
            <p className="text-muted-foreground text-xs">
              Use whole-path templates such as{" "}
              <code className="text-xs">{"{{event.payload.record.name}}"}</code>
              .
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {PATH_HINTS.map((hint) => (
                <button
                  className="rounded border bg-background px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-accent"
                  key={hint}
                  onClick={() => {
                    navigator.clipboard?.writeText(hint).catch(() => undefined);
                  }}
                  type="button"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
          {selected.variables.map((variable) => (
            <div className="space-y-1" key={variable.key}>
              <Label htmlFor={`map-${variable.key}`}>
                {variable.label}
                {variable.required ? " *" : ""}{" "}
                <span className="font-normal text-muted-foreground">
                  ({variable.key} · {variable.type})
                </span>
              </Label>
              <Input
                id={`map-${variable.key}`}
                onChange={(event) =>
                  onChange({
                    ...value,
                    mapping: {
                      ...(value.mapping ?? {}),
                      [variable.key]: event.target.value,
                    },
                  })
                }
                placeholder={"{{event.payload...}}"}
                value={value.mapping?.[variable.key] ?? ""}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

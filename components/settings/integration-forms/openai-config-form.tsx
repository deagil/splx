"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OpenAiFormState = {
  apiKey: string;
  organization: string;
};

const OPENAI_DEFAULT_STATE: OpenAiFormState = {
  apiKey: "",
  organization: "",
};

type OpenAIConfigFormProps = {
  metadata?: Record<string, unknown>;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
};

export function OpenAIConfigForm({
  metadata,
  onSuccess,
  onCancel,
  className,
}: OpenAIConfigFormProps) {
  const [form, setForm] = useState<OpenAiFormState>(deriveOpenAiState(metadata));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (metadata && !dirty) {
      setForm(deriveOpenAiState(metadata));
    }
  }, [metadata, dirty]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        apiKey: form.apiKey.trim(),
        organization: form.organization.trim() || undefined,
      };

      const response = await fetch("/api/workspace-apps/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Failed to save OpenAI key");
      }

      toast.success("OpenAI credentials updated");
      setDirty(false);
      setForm((prev) => ({ ...prev, apiKey: "" }));
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update OpenAI credentials"
      );
    } finally {
      setSaving(false);
    }
  }

  const maskedKey = metadata?.maskedKey as string | undefined;

  return (
    <form className={cn("space-y-6", className)} onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="openai-key">API key</FieldLabel>
          <Input
            id="openai-key"
            name="openai-key"
            placeholder="sk-..."
            required
            value={dirty ? form.apiKey : maskedKey ?? form.apiKey}
            onFocus={() => {
              if (!dirty) {
                setDirty(true);
                setForm((prev) => ({ ...prev, apiKey: "" }));
              }
            }}
            onChange={(event) => {
              setDirty(true);
              setForm((prev) => ({
                ...prev,
                apiKey: event.target.value,
              }));
            }}
          />
          <FieldDescription>
            We never display stored keys. Enter a new key to rotate credentials.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="openai-org">Organization (optional)</FieldLabel>
          <Input
            id="openai-org"
            name="openai-org"
            placeholder="org-..."
            value={form.organization}
            onChange={(event) => {
              setDirty(true);
              setForm((prev) => ({
                ...prev,
                organization: event.target.value,
              }));
            }}
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setDirty(false);
              setForm({
                ...deriveOpenAiState(metadata),
                apiKey: "",
              });
            }}
          >
            Reset
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving || !dirty || form.apiKey.trim().length < 8}
        >
          {saving ? "Saving..." : "Save credentials"}
        </Button>
      </div>
    </form>
  );
}

function deriveOpenAiState(metadata?: Record<string, unknown>): OpenAiFormState {
  if (!metadata) {
    return OPENAI_DEFAULT_STATE;
  }

  return {
    apiKey: "",
    organization: (metadata.organization as string) ?? "",
  };
}






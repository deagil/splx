"use client";

/**
 * "Setup" tab: the metadata that identifies a template rather than shaping it —
 * name, slug, description, preview text, status — plus deletion.
 *
 * Subject deliberately lives on the canvas header instead, where it reads as
 * part of the email rather than as a form field.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  EmailTemplateStatus,
  EmailTemplateVariable,
} from "@/lib/comms/types";
import { TokenField } from "../token-field/token-field";

export interface SetupPanelProps {
  canActivate: boolean;
  description: string;
  name: string;
  onChange: (patch: {
    description?: string;
    name?: string;
    previewText?: string;
    slug?: string;
    status?: EmailTemplateStatus;
  }) => void;
  onCreateVariable?: (
    draftKey: string
  ) => Promise<EmailTemplateVariable | null>;
  onDelete: () => void;
  previewText: string;
  slug: string;
  status: EmailTemplateStatus;
  variables: EmailTemplateVariable[];
}

export function SetupPanel({
  canActivate,
  description,
  name,
  onChange,
  onCreateVariable,
  onDelete,
  previewText,
  slug,
  status,
  variables,
}: SetupPanelProps) {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
      <div className="space-y-1.5">
        <Label htmlFor="template-name">Name</Label>
        <Input
          id="template-name"
          onChange={(event) => onChange({ name: event.target.value })}
          value={name}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-slug">Slug</Label>
        <Input
          className="font-mono text-xs"
          id="template-slug"
          onChange={(event) => onChange({ slug: event.target.value })}
          value={slug}
        />
        <p className="text-muted-foreground text-xs">
          Lowercase letters, numbers and hyphens. Used to reference this
          template.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-description">Description</Label>
        <Textarea
          id="template-description"
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="What is this email for?"
          rows={2}
          value={description}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Preview text</Label>
        <TokenField
          aria-label="Preview text"
          onChange={(next) => onChange({ previewText: next })}
          onCreateVariable={onCreateVariable}
          placeholder="The line inboxes show after the subject"
          value={previewText}
          variables={variables}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select
          onValueChange={(next) =>
            onChange({ status: next as EmailTemplateStatus })
          }
          value={status}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem disabled={!canActivate} value="active">
              Active
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {canActivate
            ? "Only active templates can be selected in workflows."
            : "Resolve the go-live checks in the header before activating."}
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-destructive/30 p-3">
        <p className="font-medium text-sm">Delete template</p>
        <p className="text-muted-foreground text-xs">
          Workflows referencing this template will fail at send time.
        </p>
        <button
          className="rounded-md border border-destructive/40 px-3 py-1.5 text-destructive text-sm transition-colors hover:bg-destructive/10"
          onClick={onDelete}
          type="button"
        >
          Delete this template
        </button>
      </div>
    </div>
  );
}

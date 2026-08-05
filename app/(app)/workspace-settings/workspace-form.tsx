"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Workspace } from "@/lib/db/schema";
import { type UpdateWorkspaceState, updateWorkspace } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save workspace profile"}
    </Button>
  );
}

export function WorkspaceProfileForm({ workspace }: { workspace: Workspace }) {
  const initialState: UpdateWorkspaceState = { status: "idle" };
  const [state, formAction] = useActionState(updateWorkspace, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Workspace updated successfully");
    } else if (state.status === "failed" || state.status === "invalid_data") {
      toast.error(state.message ?? "Failed to update workspace");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
          <Input
            defaultValue={workspace.name}
            id="workspace-name"
            name="name"
            required
            type="text"
          />
          <FieldDescription>
            Displayed to all members and in shared documents.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="workspace-description">
            Business description
          </FieldLabel>
          <Textarea
            defaultValue={workspace.description ?? ""}
            id="workspace-description"
            name="description"
            placeholder="Describe the work your organisation does to help teammates and AI features understand the context."
            rows={4}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="workspace-slug">Workspace URL</FieldLabel>
          <Input
            defaultValue={workspace.slug ?? ""}
            id="workspace-slug"
            name="slug"
            placeholder="your-workspace-slug"
            type="text"
          />
          <FieldDescription>
            Used for invite links and connecting integrations.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="workspace-avatar">
            Workspace avatar URL
          </FieldLabel>
          <Input
            defaultValue={workspace.avatar_url ?? ""}
            id="workspace-avatar"
            name="avatar_url"
            placeholder="https://example.com/logo.png"
            type="url"
          />
          <FieldDescription>
            Logo or icon representing your workspace.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

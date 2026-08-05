"use client";

import { Sparkles } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { User } from "@/lib/db/schema";
import { type UpdateProfileState, updateProfile } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save profile"}
    </Button>
  );
}

export function ProfileForm({ user }: { user: User }) {
  const initialState: UpdateProfileState = { status: "idle" };
  const [state, formAction] = useActionState(updateProfile, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Profile updated successfully");
    } else if (state.status === "failed" || state.status === "invalid_data") {
      toast.error(state.message ?? "Failed to update profile");
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <FieldGroup>
        <input name="email" type="hidden" value={user.email} />
        <Field>
          <FieldLabel htmlFor="profile-firstname">First name</FieldLabel>
          <Input
            defaultValue={user.firstname ?? ""}
            id="profile-firstname"
            name="firstname"
            required
            type="text"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-lastname">Last name</FieldLabel>
          <Input
            defaultValue={user.lastname ?? ""}
            id="profile-lastname"
            name="lastname"
            required
            type="text"
          />
        </Field>
        {/*todo email not editable for now */}
        {/* <Field>
          <FieldLabel htmlFor="profile-email">Email</FieldLabel>
          <Input
            id="profile-email"
            name="email"
            type="email"
            defaultValue={user.email}
            aria-describedby="profile-email-description"
            required
          />
          <FieldDescription id="profile-email-description">
            Changing your email address may require verification.
          </FieldDescription>
        </Field> */}
        <Field>
          <FieldLabel className="items-center gap-2" htmlFor="profile-title">
            Job title
            <Tooltip>
              <TooltipTrigger asChild>
                <Sparkles className="size-4 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Helps AI understand your perspective and expertise.</p>
              </TooltipContent>
            </Tooltip>
          </FieldLabel>
          <Input
            defaultValue={user.job_title ?? ""}
            id="profile-title"
            name="job_title"
            type="text"
          />
        </Field>
        <Field>
          <FieldLabel
            className="items-center gap-2"
            htmlFor="profile-ai-context"
          >
            Role & experience
            <Tooltip>
              <TooltipTrigger asChild>
                <Sparkles className="size-4 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Shared with AI to improve responses when personalization is
                  enabled.
                </p>
              </TooltipContent>
            </Tooltip>
          </FieldLabel>
          <Textarea
            defaultValue={user.ai_context ?? ""}
            id="profile-ai-context"
            name="ai_context"
            placeholder="Describe your responsibilities, focus areas, and background for better AI context."
            rows={4}
          />
          <FieldDescription>
            Keep this updated so AI features understand your perspective.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-avatar">Profile picture URL</FieldLabel>
          <Input
            defaultValue={user.avatar_url ?? ""}
            id="profile-avatar"
            name="avatar_url"
            placeholder="https://example.com/avatar.png"
            type="url"
          />
          <FieldDescription>
            Images should be square and at least 128 × 128 pixels.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}

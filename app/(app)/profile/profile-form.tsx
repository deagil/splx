"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { updateProfile, type UpdateProfileState } from "./actions";
import type { User } from "@/lib/db/schema";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
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
    <form className="mt-8 space-y-8" action={formAction}>
      <FieldGroup>
        <input type="hidden" name="email" value={user.email} />
        <Field>
          <FieldLabel htmlFor="profile-firstname">First name</FieldLabel>
          <Input
            id="profile-firstname"
            name="firstname"
            type="text"
            defaultValue={user.firstname ?? ""}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-lastname">Last name</FieldLabel>
          <Input
            id="profile-lastname"
            name="lastname"
            type="text"
            defaultValue={user.lastname ?? ""}
            required
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
          <FieldLabel htmlFor="profile-title" className="items-center gap-2">
            Job title
            <Tooltip>
              <TooltipTrigger asChild>
                <Sparkles className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Helps AI understand your perspective and expertise.</p>
              </TooltipContent>
            </Tooltip>
          </FieldLabel>
          <Input
            id="profile-title"
            name="job_title"
            type="text"
            defaultValue={user.job_title ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-ai-context" className="items-center gap-2">
            Role & experience
            <Tooltip>
              <TooltipTrigger asChild>
                <Sparkles className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Shared with AI to improve responses when personalization is enabled.</p>
              </TooltipContent>
            </Tooltip>
          </FieldLabel>
          <Textarea
            id="profile-ai-context"
            name="ai_context"
            rows={4}
            defaultValue={user.ai_context ?? ""}
            placeholder="Describe your responsibilities, focus areas, and background for better AI context."
          />
          <FieldDescription>
            Keep this updated so AI features understand your perspective.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-avatar">
            Profile picture URL
          </FieldLabel>
          <Input
            id="profile-avatar"
            name="avatar_url"
            type="url"
            defaultValue={user.avatar_url ?? ""}
            placeholder="https://example.com/avatar.png"
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

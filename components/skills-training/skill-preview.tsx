"use client";

import { Check, Sparkles } from "lucide-react";
import { GeneratedPreview } from "@/components/conversational-builder/steps";
import type { SkillData } from "@/lib/ai/skills-ui-schema";

interface SkillPreviewProps {
  isSaving?: boolean;
  onImprove?: () => void;
  onSave: () => void;
  skill: SkillData;
}

export function SkillPreview({
  skill,
  onSave,
  onImprove,
  isSaving = false,
}: SkillPreviewProps) {
  return (
    <GeneratedPreview
      body={
        <div className="space-y-2">
          {!!skill.description && (
            <p className="text-muted-foreground text-xs">{skill.description}</p>
          )}
          <div className="rounded border bg-background p-2">
            <p className="break-words font-mono text-muted-foreground text-xs">
              {skill.prompt}
            </p>
          </div>
        </div>
      }
      primaryAction={{
        icon: <Check className="mr-2 h-3 w-3" />,
        isLoading: isSaving,
        label: "Save Skill",
        loadingLabel: "Saving...",
        onClick: onSave,
      }}
      secondaryAction={
        onImprove
          ? {
              disabled: isSaving,
              icon: <Sparkles className="mr-2 h-3 w-3" />,
              label: "Improve Further",
              onClick: onImprove,
            }
          : undefined
      }
      subtitle={`/${skill.slug}`}
      title={skill.name}
    />
  );
}

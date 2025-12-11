"use client";

import { GeneratedPreview } from "@/components/conversational-builder/steps";
import { Check, Sparkles } from "lucide-react";
import type { SkillData } from "@/lib/ai/skills-ui-schema";

type SkillPreviewProps = {
  skill: SkillData;
  onSave: () => void;
  onImprove?: () => void;
  isSaving?: boolean;
};

export function SkillPreview({
  skill,
  onSave,
  onImprove,
  isSaving = false,
}: SkillPreviewProps) {
  return (
    <GeneratedPreview
      title={skill.name}
      subtitle={`/${skill.slug}`}
      body={
        <div className="space-y-2">
          {skill.description && (
            <p className="text-xs text-muted-foreground">{skill.description}</p>
          )}
          <div className="rounded border bg-background p-2">
            <p className="break-words font-mono text-xs text-muted-foreground">{skill.prompt}</p>
          </div>
        </div>
      }
      primaryAction={{
        label: "Save Skill",
        onClick: onSave,
        icon: <Check className="mr-2 h-3 w-3" />,
        loadingLabel: "Saving...",
        isLoading: isSaving,
      }}
      secondaryAction={
        onImprove
          ? {
              label: "Improve Further",
              onClick: onImprove,
              icon: <Sparkles className="mr-2 h-3 w-3" />,
              disabled: isSaving,
            }
          : undefined
      }
    />
  );
}


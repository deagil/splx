"use client";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-primary/5 via-primary/2 to-primary/5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{skill.name}</h4>
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
            /{skill.slug}
          </span>
        </div>
        {skill.description && (
          <p className="text-xs text-muted-foreground">{skill.description}</p>
        )}
        <div className="p-2 rounded bg-background border">
          <p className="text-xs font-mono text-muted-foreground break-words">
            {skill.prompt}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {onImprove && (
          <Button
            variant="outline"
            size="sm"
            onClick={onImprove}
            disabled={isSaving}
            className="flex-1"
          >
            <Sparkles className="h-3 w-3 mr-2" />
            Improve Further
          </Button>
        )}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Check className="h-3 w-3 mr-2" />
              Save Skill
            </>
          )}
        </Button>
      </div>
    </div>
  );
}



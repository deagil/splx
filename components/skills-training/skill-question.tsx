"use client";

import { Button } from "@/components/ui/button";
import type { SkillOption } from "@/lib/ai/skills-ui-schema";

type SkillQuestionProps = {
  message: string;
  options?: SkillOption[];
  onSelect: (value: string) => void;
};

export function SkillQuestion({
  message,
  options = [],
  onSelect,
}: SkillQuestionProps) {
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
      <p className="text-sm font-medium">{message}</p>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}



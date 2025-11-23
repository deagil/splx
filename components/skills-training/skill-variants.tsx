"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import type { SkillOption } from "@/lib/ai/skills-ui-schema";

type SkillVariantsProps = {
  message: string;
  options?: SkillOption[];
  onSelect: (value: string) => void;
};

export function SkillVariants({
  message,
  options = [],
  onSelect,
}: SkillVariantsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (value: string, index: number) => {
    setSelectedIndex(index);
    onSelect(value);
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
      <p className="text-sm font-medium">{message}</p>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              key={index}
              variant={selectedIndex === index ? "default" : "outline"}
              className="w-full justify-between"
              onClick={() => handleSelect(option.value, index)}
            >
              <span className="text-left flex-1">{option.label}</span>
              {selectedIndex === index && (
                <Check className="h-4 w-4 ml-2" />
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}



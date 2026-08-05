"use client";

import {
  type ConversationOption,
  ConversationVariants,
} from "@/components/conversational-builder/steps";
import type { SkillOption } from "@/lib/ai/skills-ui-schema";

interface SkillVariantsProps {
  message: string;
  onSelect: (value: string) => void;
  options?: SkillOption[];
}

export function SkillVariants({
  message,
  options = [],
  onSelect,
}: SkillVariantsProps) {
  return (
    <ConversationVariants
      message={message}
      onSelect={onSelect}
      options={options as ConversationOption[]}
    />
  );
}

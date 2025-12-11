"use client";

import {
  ConversationVariants,
  type ConversationOption,
} from "@/components/conversational-builder/steps";
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
  return (
    <ConversationVariants
      message={message}
      options={options as ConversationOption[]}
      onSelect={onSelect}
    />
  );
}


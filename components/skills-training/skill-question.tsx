"use client";

import {
  type ConversationOption,
  ConversationQuestion,
} from "@/components/conversational-builder/steps";
import type { SkillOption } from "@/lib/ai/skills-ui-schema";

interface SkillQuestionProps {
  message: string;
  onSelect: (value: string) => void;
  options?: SkillOption[];
}

export function SkillQuestion({
  message,
  options = [],
  onSelect,
}: SkillQuestionProps) {
  return (
    <ConversationQuestion
      message={message}
      onSelect={onSelect}
      options={options as ConversationOption[]}
    />
  );
}

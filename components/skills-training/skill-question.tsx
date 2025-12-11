"use client";

import {
  ConversationQuestion,
  type ConversationOption,
} from "@/components/conversational-builder/steps";
import type { SkillOption } from "@/lib/ai/skills-ui-schema";

type SkillQuestionProps = {
  message: string;
  options?: SkillOption[];
  onSelect: (value: string) => void;
};

export function SkillQuestion({ message, options = [], onSelect }: SkillQuestionProps) {
  return (
    <ConversationQuestion
      message={message}
      options={options as ConversationOption[]}
      onSelect={onSelect}
    />
  );
}



"use client";

import { ConversationClarification } from "@/components/conversational-builder/steps";

interface SkillClarificationProps {
  message: string;
  onSubmit: (response: string) => void;
}

export function SkillClarification({
  message,
  onSubmit,
}: SkillClarificationProps) {
  return <ConversationClarification message={message} onSubmit={onSubmit} />;
}

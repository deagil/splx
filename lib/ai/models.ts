import { Sparkles, Telescope } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  useCases: string;
  speed: "fast" | "thorough";
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Assistant",
    description: "Fast, efficient responses",
    icon: Sparkles,
    useCases: "Quick answers, code writing, general questions",
    speed: "fast",
  },
  {
    id: "chat-model-reasoning",
    name: "Deep It",
    description: "Thorough reasoning, takes longer",
    icon: Telescope,
    useCases: "Multi-step planning, deep analysis, tough debugging",
    speed: "thorough",
  },
];

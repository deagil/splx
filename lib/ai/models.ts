import type { LucideIcon } from "lucide-react";
import { Sparkles, Telescope } from "lucide-react";

export const DEFAULT_CHAT_MODEL: string = "chat-model";

export interface ChatModel {
  description: string;
  icon: LucideIcon;
  id: string;
  name: string;
  speed: "fast" | "thorough";
  useCases: string;
}

export const chatModels: ChatModel[] = [
  {
    description: "All-round agent for work",
    icon: Sparkles,
    id: "chat-model",
    name: "Assist",
    speed: "fast",
    useCases: "Quick answers, code writing, general questions",
  },
  {
    description: "Think through problems and ideas",
    icon: Telescope,
    id: "chat-model-reasoning",
    name: "Plan",
    speed: "thorough",
    useCases: "Multi-step planning, deep analysis, tough debugging",
  },
];

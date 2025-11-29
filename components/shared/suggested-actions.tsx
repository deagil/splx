"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo } from "react";
import { usePathname } from "next/navigation";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "../elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/";
  
  const suggestedActions = [
    "What are the advantages of using Next.js?",
    "Write code to demonstrate Dijkstra's algorithm",
    "Help me write an essay about Silicon Valley",
    "What is the weather in San Francisco?",
  ];

  return (
    <motion.div
      className="flex w-full flex-col gap-2"
      data-testid="suggested-actions"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1,
          },
        },
        exit: {
          transition: {
            staggerChildren: 0.03,
            staggerDirection: -1,
          },
        },
      }}
    >
      {suggestedActions.map((suggestedAction) => (
        <motion.div
          key={suggestedAction}
          variants={{
            hidden: { opacity: 0, y: 12, scale: 0.97 },
            visible: { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 25,
              },
            },
            exit: { 
              opacity: 0, 
              y: -8, 
              scale: 0.97,
              transition: { duration: 0.15 },
            },
          }}
        >
          <Suggestion
            className="h-auto max-w-[calc(100%-1rem)] whitespace-normal rounded-lg px-3 py-2 text-left transition-colors duration-150"
            onClick={(suggestion) => {
              // Only navigate if not on dashboard route
              if (!isDashboardRoute) {
                window.history.replaceState({}, "", `?chatId=${chatId}`);
              }
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </motion.div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);

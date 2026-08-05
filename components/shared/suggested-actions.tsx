"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { memo } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "../elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

interface SuggestedActionsProps {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
}

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
      animate="visible"
      className="flex w-full flex-col gap-2"
      data-testid="suggested-actions"
      exit="exit"
      initial="hidden"
      variants={{
        exit: {
          transition: {
            staggerChildren: 0.03,
            staggerDirection: -1,
          },
        },
        hidden: {},
        visible: {
          transition: {
            delayChildren: 0.1,
            staggerChildren: 0.06,
          },
        },
      }}
    >
      {suggestedActions.map((suggestedAction) => (
        <motion.div
          key={suggestedAction}
          variants={{
            exit: {
              opacity: 0,
              scale: 0.97,
              transition: { duration: 0.15 },
              y: -8,
            },
            hidden: { opacity: 0, scale: 0.97, y: 12 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: {
                damping: 25,
                stiffness: 400,
                type: "spring",
              },
              y: 0,
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
                parts: [{ text: suggestion, type: "text" }],
                role: "user",
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

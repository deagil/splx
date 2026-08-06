"use client";

import { useEffect, useState } from "react";
import {
  CHAT_SIDEBAR_SIDE_CHANGED_EVENT,
  type ChatSidebarSide,
  DEFAULT_CHAT_SIDEBAR_SIDE,
  readChatSidebarSide,
  toggleChatSidebarSide,
  writeChatSidebarSide,
} from "@/components/sidebar/chat-sidebar-side";

export function useChatSidebarSide() {
  const [side, setSide] = useState<ChatSidebarSide>(DEFAULT_CHAT_SIDEBAR_SIDE);

  useEffect(() => {
    setSide(readChatSidebarSide());

    const onChange = (event: Event) => {
      const { detail } = event as CustomEvent<ChatSidebarSide>;
      if (detail === "left" || detail === "right") {
        setSide(detail);
      }
    };

    window.addEventListener(CHAT_SIDEBAR_SIDE_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(CHAT_SIDEBAR_SIDE_CHANGED_EVENT, onChange);
    };
  }, []);

  return {
    setSide: (next: ChatSidebarSide) => {
      writeChatSidebarSide(next);
      setSide(next);
    },
    side,
    toggleSide: () => {
      const next = toggleChatSidebarSide(side);
      setSide(next);
    },
  };
}

export type ChatSidebarSide = "left" | "right";

/** Default when nothing is stored yet. */
export const DEFAULT_CHAT_SIDEBAR_SIDE: ChatSidebarSide = "left";

export const CHAT_SIDEBAR_SIDE_KEY = "chat-sidebar-side";
export const CHAT_SIDEBAR_SIDE_CHANGED_EVENT = "chat-sidebar-side-changed";

export function isChatSidebarSide(value: unknown): value is ChatSidebarSide {
  return value === "left" || value === "right";
}

export function readChatSidebarSide(): ChatSidebarSide {
  if (typeof window === "undefined") {
    return DEFAULT_CHAT_SIDEBAR_SIDE;
  }
  const stored = window.localStorage.getItem(CHAT_SIDEBAR_SIDE_KEY);
  return isChatSidebarSide(stored) ? stored : DEFAULT_CHAT_SIDEBAR_SIDE;
}

export function writeChatSidebarSide(side: ChatSidebarSide): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CHAT_SIDEBAR_SIDE_KEY, side);
  window.dispatchEvent(
    new CustomEvent<ChatSidebarSide>(CHAT_SIDEBAR_SIDE_CHANGED_EVENT, {
      detail: side,
    })
  );
}

export function toggleChatSidebarSide(
  current: ChatSidebarSide = readChatSidebarSide()
): ChatSidebarSide {
  const next: ChatSidebarSide = current === "left" ? "right" : "left";
  writeChatSidebarSide(next);
  return next;
}

/**
 * @deprecated Prefer `useChatSidebarSide()` / `readChatSidebarSide()`. Kept as
 * the compile-time default for any remaining static reads during SSR.
 */
export const CHAT_SIDEBAR_SIDE = DEFAULT_CHAT_SIDEBAR_SIDE;

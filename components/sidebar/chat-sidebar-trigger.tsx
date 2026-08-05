"use client";

import { MessageIcon } from "@/components/shared/icons";
import { CHAT_SIDEBAR_SIDE } from "@/components/sidebar/chat-sidebar-side";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function ChatSidebarTrigger() {
  const { toggleSidebar, open } = useSidebar();

  return (
    <div
      className={cn(
        "grid shrink-0 transition-[grid-template-columns,margin] duration-250 ease-in-out",
        open ? "grid-cols-[0fr]" : "grid-cols-[1fr]",
        open && (CHAT_SIDEBAR_SIDE === "left" ? "-mr-2" : "-ml-2")
      )}
    >
      <div className="min-w-0 overflow-hidden">
        <Button
          className={cn(
            "transition-opacity duration-250 ease-in-out",
            open && "pointer-events-none opacity-0"
          )}
          onClick={toggleSidebar}
          type="button"
          variant="secondary"
        >
          <MessageIcon size={16} />
          <span className="hidden sm:inline">Chat</span>
        </Button>
      </div>
    </div>
  );
}

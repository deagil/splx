"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MessageIcon } from "@/components/shared/icons";
import { CHAT_SIDEBAR_SIDE } from "@/components/sidebar/chat-sidebar-side";
import { cn } from "@/lib/utils";

export function ChatSidebarTrigger() {
  const { toggleSidebar, open } = useSidebar();

  return (
    <div
      className={cn(
        "grid transition-[grid-template-columns,margin] duration-250 ease-in-out",
        CHAT_SIDEBAR_SIDE === "right" && "ml-auto",
        open ? "grid-cols-[0fr]" : "grid-cols-[1fr]",
        open && (CHAT_SIDEBAR_SIDE === "left" ? "-mr-2" : "-ml-2")
      )}
    >
      <div className="min-w-0 overflow-hidden">
        <Button
          className={cn(
            "transition-opacity ease-in-out duration-250",
            open && "opacity-0 pointer-events-none"
          )}
          onClick={toggleSidebar}
          type="button"
          variant="secondary"
        >
          <MessageIcon size={16} />
          <span className=" hidden sm:inline">Chat</span>
        </Button>
      </div>
    </div>
  );
}

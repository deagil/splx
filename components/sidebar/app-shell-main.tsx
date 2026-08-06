"use client";

import TopNav from "@/components/custom/topnav";
import { ChatSidebarTrigger } from "@/components/sidebar/chat-sidebar-trigger";
import { useChatSidebarSide } from "@/components/sidebar/use-chat-sidebar-side";
import { SidebarInset } from "@/components/ui/sidebar";

export function AppShellMain({ children }: { children: React.ReactNode }) {
  const { side } = useChatSidebarSide();

  return (
    <SidebarInset
      className={side === "right" ? "md:order-first" : "md:order-last"}
    >
      <header className="flex h-16 shrink-0 items-center gap-2 px-3.5">
        {side === "left" ? <ChatSidebarTrigger /> : null}
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center">
          <TopNav />
        </div>
        {side === "right" ? <ChatSidebarTrigger /> : null}
      </header>
      <div className="flex-1 overflow-auto px-6 pb-6">{children}</div>
    </SidebarInset>
  );
}

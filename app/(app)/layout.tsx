import Script from "next/script";
import { Suspense } from "react";
import TopNav from "@/components/custom/topnav";
import { DataStreamProvider } from "@/components/shared/data-stream-provider";
import { CHAT_SIDEBAR_SIDE } from "@/components/sidebar/chat-sidebar-side";
import { ChatSidebarTrigger } from "@/components/sidebar/chat-sidebar-trigger";
import { ChatSidebarWrapper } from "@/components/sidebar/chat-sidebar-wrapper";
import { SidebarWidthManager } from "@/components/sidebar/sidebar-width-manager";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { User } from "@/lib/types";

async function AuthenticatedSidebar() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return null;
  }

  const user: User = {
    email: authUser.email ?? null,
    id: authUser.id,
    name: authUser.email?.split("@")[0] ?? null,
    type: "regular" as const,
  };

  return <ChatSidebarWrapper user={user} />;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // Keep auth/cookies inside Suspense and render {children} as a sibling so
  // Instant can ship the page shell without waiting on getUser().
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <SidebarProvider
          defaultOpen
          style={
            {
              "--sidebar-width": "30rem",
            } as React.CSSProperties
          }
        >
          <SidebarWidthManager />
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center p-4">
                <Skeleton className="h-8 w-full" />
              </div>
            }
          >
            <AuthenticatedSidebar />
          </Suspense>
          <SidebarInset
            className={
              CHAT_SIDEBAR_SIDE === "right" ? "md:order-first" : "md:order-last"
            }
          >
            <header className="flex h-16 shrink-0 items-center gap-2 px-3.5">
              {CHAT_SIDEBAR_SIDE === "left" ? <ChatSidebarTrigger /> : null}
              <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center">
                <TopNav />
              </div>
              {CHAT_SIDEBAR_SIDE === "right" ? <ChatSidebarTrigger /> : null}
            </header>
            <div className="flex-1 overflow-auto px-6 pb-6">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}

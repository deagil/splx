import { Suspense } from "react";
import { DataStreamProvider } from "@/components/shared/data-stream-provider";
import { AppShellMain } from "@/components/sidebar/app-shell-main";
import { ChatSidebarWrapper } from "@/components/sidebar/chat-sidebar-wrapper";
import { SidebarWidthManager } from "@/components/sidebar/sidebar-width-manager";
import { SidebarProvider } from "@/components/ui/sidebar";
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
        <AppShellMain>{children}</AppShellMain>
      </SidebarProvider>
    </DataStreamProvider>
  );
}

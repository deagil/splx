import { Suspense } from "react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { WelcomeState } from "@/components/dashboard/welcome-state";
import {
  getDashboardStats,
  getOnboardingStatus,
  getRecentActivity,
  getUserProfile,
} from "@/lib/data/dashboard";
import { getAuthenticatedUser } from "@/lib/supabase/server";

// Separate the async data fetching component
async function Dashboard() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }

  const { resolveTenantContext } = await import("@/lib/server/tenant/context");
  let workspaceId: string;
  try {
    const context = await resolveTenantContext();
    ({ workspaceId } = context);
  } catch (e) {
    console.error("Could not resolve tenant context", e);
    return <div>Error loading dashboard: No workspace context.</div>;
  }

  const [stats, activity, onboarding, userProfile] = await Promise.all([
    getDashboardStats(user.id, workspaceId),
    getRecentActivity(user.id, workspaceId),
    getOnboardingStatus(workspaceId),
    getUserProfile(user.id),
  ]);

  const showWelcome = !onboarding.hasActivity;

  // Use profile firstname if available, otherwise fallback to metadata or email
  const displayName =
    userProfile?.firstname ||
    user.user_metadata?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="fade-in mx-auto flex w-full max-w-4xl flex-1 animate-in flex-col p-6 duration-500 md:p-8">
      {showWelcome ? (
        <WelcomeState
          hasConnectedApps={onboarding.hasConnectedApps}
          userName={displayName}
        />
      ) : (
        <div className="space-y-12">
          <GreetingCard stats={stats} userName={displayName} />

          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <ActivityFeed items={activity} />
            </div>
            {/* Right column for "Today" schedule or similar, leaving empty or putting a calendar widget placeholder as per design vibe */}
            <div className="hidden space-y-4 md:block">
              <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <div className="mb-2 font-medium text-sm">My Calendar</div>
                {/* Placeholder for calendar widget */}
                <div className="flex aspect-square items-center justify-center rounded-lg bg-muted/20 text-muted-foreground text-xs">
                  Calendar Integration Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardContent() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}

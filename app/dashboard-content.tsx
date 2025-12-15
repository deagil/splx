import { Suspense } from "react";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getDashboardStats, getRecentActivity, getOnboardingStatus, getUserProfile } from "@/lib/data/dashboard";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { WelcomeState } from "@/components/dashboard/welcome-state";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

// Separate the async data fetching component
async function Dashboard() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const { resolveTenantContext } = await import("@/lib/server/tenant/context");
  let workspaceId: string;
  try {
    const context = await resolveTenantContext();
    workspaceId = context.workspaceId;
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
  const displayName = userProfile?.firstname || user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";

  return (
    <div className="flex flex-1 flex-col p-6 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      {showWelcome ? (
        <WelcomeState userName={displayName} hasConnectedApps={onboarding.hasConnectedApps} />
      ) : (
        <div className="space-y-12">
          <GreetingCard userName={displayName} stats={stats} />
          
          <div className="grid gap-8 md:grid-cols-3">
             <div className="md:col-span-2">
                 <ActivityFeed items={activity} />
             </div>
             {/* Right column for "Today" schedule or similar, leaving empty or putting a calendar widget placeholder as per design vibe */}
             <div className="hidden md:block space-y-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
                  <div className="text-sm font-medium mb-2">My Calendar</div>
                    {/* Placeholder for calendar widget */}
                     <div className="aspect-square bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground text-xs">
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


import type { DashboardStats } from "@/lib/data/dashboard";

interface GreetingCardProps {
  stats: DashboardStats;
  userName?: string | null;
}

export function GreetingCard({ userName, stats }: GreetingCardProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const firstName = userName || "there";
  const { documentsCreatedToday, chatsStartedToday } = stats;

  const hasActivity = documentsCreatedToday > 0 || chatsStartedToday > 0;

  return (
    <div className="flex flex-col gap-2 py-8">
      <div className="flex items-center gap-2">
        <h1 className="font-bold text-4xl text-foreground tracking-tight">
          {greeting}, {firstName}.
        </h1>
      </div>

      <div className="mt-2 max-w-2xl text-muted-foreground/80 text-xl leading-relaxed">
        {hasActivity ? (
          <>
            You created{" "}
            <span className="font-medium text-foreground">
              {documentsCreatedToday} documents
            </span>{" "}
            and started{" "}
            <span className="font-medium text-foreground">
              {chatsStartedToday} chats
            </span>{" "}
            today.
          </>
        ) : (
          "You're all caught up for today."
        )}
      </div>
    </div>
  );
}

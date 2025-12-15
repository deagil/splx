import { type DashboardStats } from "@/lib/data/dashboard";
import { User } from "lucide-react";

interface GreetingCardProps {
  userName?: string | null;
  stats: DashboardStats;
}

export function GreetingCard({ userName, stats }: GreetingCardProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";

  const firstName = userName || "there";
  const { documentsCreatedToday, chatsStartedToday } = stats;

  const hasActivity = documentsCreatedToday > 0 || chatsStartedToday > 0;

  return (
    <div className="flex flex-col gap-2 py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {greeting}, {firstName}.
        </h1>
      </div>
      
      <div className="mt-2 text-xl text-muted-foreground/80 max-w-2xl leading-relaxed">
        {hasActivity ? (
          <>
            You created <span className="text-foreground font-medium">{documentsCreatedToday} documents</span> and started{" "}
            <span className="text-foreground font-medium">{chatsStartedToday} chats</span> today.
          </>
        ) : (
          "You're all caught up for today."
        )}
      </div>
    </div>
  );
}

import { ActivityItem } from "@/lib/data/dashboard";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, FileText, Layout } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) return null;

  // Group by date (Today, Yesterday, etc.) - Simplified for now to just a single list
  // The design reference shows a timeline on the left.

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Recent Activity
      </h2>
      <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
        {items.map((item, index) => {
          const date = new Date(item.data.created_at);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const relativeTime = formatDistanceToNow(date, { addSuffix: true });
          
          let icon;
          let title;
          let href;
          let typeLabel;

          if (item.type === "chat") {
            icon = <MessageSquare className="h-4 w-4 text-blue-500" />;
            title = item.data.title || "Untitled Chat";
            href = `/chat/${item.data.id}`;
            typeLabel = "Chat";
          } else if (item.type === "document") {
            icon = <FileText className="h-4 w-4 text-green-500" />;
            title = item.data.title || "Untitled Document";
            href = `/documents/${item.data.id}`;
            typeLabel = "Document";
          } else {
            icon = <Layout className="h-4 w-4 text-orange-500" />;
            title = item.data.name || "Untitled Page";
            href = `/pages/${item.data.id}`;
            typeLabel = "Page";
          }

          return (
            <div key={`${item.type}-${item.data.id}`} className="relative pl-8 group">
              {/* Timeline dot */}
              <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-background bg-muted-foreground/30 ring-4 ring-background group-hover:bg-primary transition-colors" />
              
              <Link href={href} className="block group-hover:translate-x-1 transition-transform">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                    {icon}
                    <span>{title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{time}</span>
                    <span>•</span>
                    <span>{typeLabel}</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

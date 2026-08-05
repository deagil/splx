import { formatDistanceToNow } from "date-fns";
import { FileText, Layout, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ActivityItem } from "@/lib/data/dashboard";

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return null;
  }

  // Group by date (Today, Yesterday, etc.) - Simplified for now to just a single list
  // The design reference shows a timeline on the left.

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
        Recent Activity
      </h2>
      <div className="relative ml-3 space-y-6 border-muted border-l pb-4">
        {items.map((item, _index) => {
          const date = new Date(item.data.created_at);
          const time = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const _relativeTime = formatDistanceToNow(date, { addSuffix: true });

          let icon: ReactNode;
          let title: string;
          let href: string;
          let typeLabel: string;

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
            <div
              className="group relative pl-8"
              key={`${item.type}-${item.data.id}`}
            >
              {/* Timeline dot */}
              <div className="absolute top-1 -left-[5px] h-2.5 w-2.5 rounded-full border border-background bg-muted-foreground/30 ring-4 ring-background transition-colors group-hover:bg-primary" />

              <Link
                className="block transition-transform group-hover:translate-x-1"
                href={href}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                    {icon}
                    <span>{title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
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

"use client";

import {
  Database,
  Sparkles,
  Cloud,
  MessageSquare,
  FileCode,
  Link2,
  Mail,
  Calendar,
  FileText,
  Palette,
  Zap,
  Github,
  Slack,
  Trello,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Decorative icons for the carousel
 */
const icons: Array<{ icon: LucideIcon; color: string }> = [
  { icon: Database, color: "text-blue-600 dark:text-blue-400" },
  { icon: Sparkles, color: "text-emerald-600 dark:text-emerald-400" },
  { icon: Github, color: "text-gray-800 dark:text-gray-300" },
  { icon: Slack, color: "text-purple-600 dark:text-purple-400" },
  { icon: Cloud, color: "text-sky-600 dark:text-sky-400" },
  { icon: MessageSquare, color: "text-pink-600 dark:text-pink-400" },
  { icon: FileCode, color: "text-orange-600 dark:text-orange-400" },
  { icon: Link2, color: "text-indigo-600 dark:text-indigo-400" },
  { icon: Mail, color: "text-red-600 dark:text-red-400" },
  { icon: Calendar, color: "text-teal-600 dark:text-teal-400" },
  { icon: FileText, color: "text-amber-600 dark:text-amber-400" },
  { icon: Palette, color: "text-rose-600 dark:text-rose-400" },
  { icon: Zap, color: "text-yellow-600 dark:text-yellow-400" },
  { icon: Trello, color: "text-blue-500 dark:text-blue-400" },
];

/**
 * Decorative header banner - infinite carousel of icons.
 * Icons maintain consistent spacing; narrower windows show fewer icons
 * but the carousel continues to cycle smoothly.
 */
export function IntegrationHeader() {
  // Double the icons for seamless loop
  const duplicatedIcons = [...icons, ...icons];

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {/* Gradient fades on edges for smooth appearance */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Carousel track - uses inline styles to avoid affecting page layout */}
      <div 
        className="flex py-3"
        style={{
          width: "max-content",
          animation: "carousel 30s linear infinite",
        }}
      >
        {duplicatedIcons.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl mx-2",
                "bg-white dark:bg-slate-800/80 border shadow-sm",
                "transition-transform duration-300",
                "hover:scale-110 hover:-translate-y-1"
              )}
            >
              <Icon className={cn("size-5", item.color)} />
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes carousel {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import {
  Calendar,
  Cloud,
  Database,
  FileCode,
  FileText,
  GitBranch,
  Hash,
  Link2,
  type LucideIcon,
  Mail,
  MessageSquare,
  Palette,
  Sparkles,
  SquareKanban,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Decorative icons for the carousel
 */
const icons: Array<{ icon: LucideIcon; color: string }> = [
  { color: "text-blue-600 dark:text-blue-400", icon: Database },
  { color: "text-emerald-600 dark:text-emerald-400", icon: Sparkles },
  { color: "text-gray-800 dark:text-gray-300", icon: GitBranch },
  { color: "text-purple-600 dark:text-purple-400", icon: Hash },
  { color: "text-sky-600 dark:text-sky-400", icon: Cloud },
  { color: "text-pink-600 dark:text-pink-400", icon: MessageSquare },
  { color: "text-orange-600 dark:text-orange-400", icon: FileCode },
  { color: "text-indigo-600 dark:text-indigo-400", icon: Link2 },
  { color: "text-red-600 dark:text-red-400", icon: Mail },
  { color: "text-teal-600 dark:text-teal-400", icon: Calendar },
  { color: "text-amber-600 dark:text-amber-400", icon: FileText },
  { color: "text-rose-600 dark:text-rose-400", icon: Palette },
  { color: "text-yellow-600 dark:text-yellow-400", icon: Zap },
  { color: "text-blue-500 dark:text-blue-400", icon: SquareKanban },
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
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

      {/* Carousel track - uses inline styles to avoid affecting page layout */}
      <div
        className="flex py-3"
        style={{
          animation: "carousel 30s linear infinite",
          width: "max-content",
        }}
      >
        {duplicatedIcons.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              className={cn(
                "mx-2 flex size-10 shrink-0 items-center justify-center rounded-xl",
                "border bg-white shadow-sm dark:bg-slate-800/80",
                "transition-transform duration-300",
                "hover:-translate-y-1 hover:scale-110"
              )}
              key={index}
            >
              <Icon className={cn("size-5", item.color)} />
            </div>
          );
        })}
      </div>

      <style global jsx>{`
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

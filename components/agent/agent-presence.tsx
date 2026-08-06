"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AgentOrb, type OrbState } from "@/components/agent/ui/agent-orb";
import { cn } from "@/lib/utils";

/**
 * Floating agent presence above the composer — centered pill with feathered
 * backdrop. Orb state crossfades; label fades with it.
 */
export function AgentPresence({
  state = "breathing",
  label = "Thinking…",
  paused = false,
  className,
}: {
  state?: OrbState;
  label?: string;
  paused?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      className={cn("pointer-events-auto relative", className)}
    >
      {/* Soft feathered pool so the pill reads against the message fade */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2",
          "h-16 w-[min(20rem,70vw)] rounded-full",
          "bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_92%,transparent)_0%,color-mix(in_oklab,var(--background)_55%,transparent)_45%,transparent_75%)]",
          "dark:bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_88%,transparent)_0%,color-mix(in_oklab,var(--background)_40%,transparent)_50%,transparent_78%)]"
        )}
      />

      <div
        className={cn(
          "inline-flex max-w-[min(20rem,80vw)] items-center gap-2.5 rounded-full",
          "border border-border/50",
          "bg-[color-mix(in_oklab,var(--card)_78%,var(--background))]",
          "px-3 py-1.5 text-muted-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.08)]",
          "backdrop-blur-md",
          "dark:border-white/10 dark:bg-[color-mix(in_oklab,var(--card)_72%,var(--background))]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_28px_rgba(0,0,0,0.35)]"
        )}
      >
        <AgentOrb aria-label={label} paused={paused} state={state} />
        <span className="relative min-w-0 overflow-hidden">
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="shimmer shimmer-duration-1000 block truncate font-medium text-xs"
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              key={label}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
    </div>
  );
}

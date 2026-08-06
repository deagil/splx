"use client";

import { CopyIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  agentLayoutSpring,
  agentRevealEase,
} from "@/components/agent/lib/motion";
import { AgentOrb, type OrbState } from "@/components/agent/ui/agent-orb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AgentPresenceError {
  copied?: boolean;
  message: string;
  onCopy: () => void | Promise<void>;
  onDismiss: () => void;
}

/**
 * Floating agent presence above the composer — centered pill with feathered
 * backdrop. Pill width morphs between labels (Dynamic Island–style); orb and
 * copy crossfade in sync. Turn failures reuse the same shell without the orb.
 */
export function AgentPresence({
  state = "breathing",
  label = "Thinking…",
  paused = false,
  attention = false,
  error,
  className,
}: {
  state?: OrbState;
  label?: string;
  paused?: boolean;
  /** Blocked on the user — draws the eye with a slow warm sweep. */
  attention?: boolean;
  error?: AgentPresenceError;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const isError = Boolean(error);

  return (
    <div
      aria-live="polite"
      className={cn("pointer-events-auto relative", className)}
      role={isError ? "alert" : undefined}
    >
      {/* Soft feathered pool so the pill reads against the message fade */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2",
          "h-16 w-[min(20rem,70vw)] rounded-full",
          isError
            ? "bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--destructive)_18%,transparent)_0%,transparent_75%)]"
            : "bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_92%,transparent)_0%,color-mix(in_oklab,var(--background)_55%,transparent)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--background)_88%,transparent)_0%,color-mix(in_oklab,var(--background)_40%,transparent)_50%,transparent_78%)]"
        )}
      />

      <motion.div
        className={cn(
          "overflow-hidden border backdrop-blur-md",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.08)]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_28px_rgba(0,0,0,0.35)]",
          isError
            ? "flex w-full max-w-full items-start gap-2 border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,var(--background))] px-3 py-2 text-destructive"
            : cn(
                "inline-flex max-w-[min(20rem,80vw)] items-center gap-2.5 px-3 py-1.5",
                "bg-[color-mix(in_oklab,var(--card)_78%,var(--background))] text-muted-foreground",
                "dark:bg-[color-mix(in_oklab,var(--card)_72%,var(--background))]",
                attention
                  ? "attention-shimmer border-amber-500/40 dark:border-amber-400/30"
                  : "border-border/50 dark:border-white/10"
              )
        )}
        layout={!reduceMotion}
        style={{ borderRadius: 9999 }}
        transition={{ layout: agentLayoutSpring }}
      >
        {error ? (
          <>
            <span className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  className="block whitespace-normal text-left font-medium text-xs leading-snug"
                  initial={
                    reduceMotion
                      ? false
                      : { filter: "blur(4px)", opacity: 0, y: 3 }
                  }
                  key={error.message}
                  layout="position"
                  transition={{
                    duration: reduceMotion ? 0 : 0.22,
                    ease: agentRevealEase,
                    layout: agentLayoutSpring,
                  }}
                >
                  {error.message}
                </motion.span>
              </AnimatePresence>
            </span>
            <div className="-mt-0.5 flex shrink-0 items-center gap-0.5">
              <Button
                aria-label={error.copied ? "Copied" : "Copy error details"}
                className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={error.onCopy}
                size="icon"
                type="button"
                variant="ghost"
              >
                <CopyIcon className="size-3.5" />
              </Button>
              <Button
                aria-label="Dismiss error"
                className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={error.onDismiss}
                size="icon"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <AgentOrb aria-label={label} paused={paused} state={state} />
            <span className="relative min-w-0 overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  className="shimmer shimmer-duration-1000 block truncate font-medium text-xs"
                  exit={
                    reduceMotion
                      ? undefined
                      : { filter: "blur(4px)", opacity: 0, y: -3 }
                  }
                  initial={
                    reduceMotion
                      ? false
                      : { filter: "blur(4px)", opacity: 0, y: 3 }
                  }
                  key={label}
                  layout="position"
                  transition={{
                    duration: reduceMotion ? 0 : 0.22,
                    ease: agentRevealEase,
                    layout: agentLayoutSpring,
                  }}
                >
                  {label}
                </motion.span>
              </AnimatePresence>
            </span>
          </>
        )}
      </motion.div>
    </div>
  );
}

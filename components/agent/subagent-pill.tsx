"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatElapsed } from "@/components/agent/lib/format-elapsed";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import { useElapsedSeconds } from "@/components/agent/parts/use-elapsed-seconds";
import { AgentOrb } from "@/components/agent/ui/agent-orb";
import { cn } from "@/lib/utils";

/**
 * One running subagent: a tinted orb and its live activity label.
 *
 * The subagent's name is deliberately not shown — the action is what carries
 * meaning, and the orb colour is what tells the children apart. The name still
 * reaches assistive tech through the orb's label.
 *
 * No backdrop blur: the pill renders inside `MessageContent`, which is
 * `overflow-hidden`, and a backdrop filter there paints to the square
 * border-box — that was the source of the cropped, square-edged shadow.
 */
export function SubagentPill({
  subagent,
  colorFilter,
  className,
}: {
  subagent: SubagentActivity;
  /** CSS filter tinting this subagent's orb — see `lib/subagent-color.ts`. */
  colorFilter?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const elapsed = formatElapsed(useElapsedSeconds(true));
  // `listening` is what orb resolution assigns when a child is blocked on the
  // user, so it doubles as the attention signal.
  const needsInput = subagent.state === "listening";

  return (
    <div
      className={cn(
        "pointer-events-auto inline-flex max-w-full items-center gap-1.5",
        "rounded-full border py-1 pr-2.5 pl-1.5",
        "bg-[color-mix(in_oklab,var(--card)_88%,var(--background))]",
        // Tight and low-contrast: a small chip only needs a hint of lift, and
        // a wide halo is what reads as "cropped" against a clipping parent.
        "shadow-[0_1px_1px_rgba(0,0,0,0.03),0_1px_4px_rgba(0,0,0,0.05)]",
        "dark:bg-[color-mix(in_oklab,var(--card)_82%,var(--background))]",
        "dark:shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
        needsInput
          ? "attention-shimmer border-amber-500/40 dark:border-amber-400/30"
          : "border-border/40 dark:border-white/10",
        className
      )}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={colorFilter ? { filter: colorFilter } : undefined}
      >
        <AgentOrb
          aria-label={`${subagent.name}: ${subagent.label}`}
          className="scale-[0.78]"
          state={subagent.state}
        />
      </span>

      <span className="relative min-w-0 overflow-hidden text-muted-foreground text-xs">
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="block truncate"
            exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
            initial={reduceMotion ? false : { opacity: 0, y: 3 }}
            key={subagent.label}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {subagent.label}
          </motion.span>
        </AnimatePresence>
      </span>

      {elapsed ? (
        <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">
          {elapsed}
        </span>
      ) : null}
    </div>
  );
}

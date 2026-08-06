"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import {
  type OrbSize,
  type OrbState,
  ThinkingOrb,
  type ThinkingOrbProps,
} from "thinking-orbs";
import { cn } from "@/lib/utils";

export type { OrbSize, OrbState };

/** Display size for chat presence — package preset is 20; we scale slightly up. */
export const AGENT_ORB_DISPLAY_PX = 28;

export type AgentOrbProps = Omit<ThinkingOrbProps, "theme" | "size"> & {
  /** Package canvas preset (always 20 for chat). Display size is scaled via CSS. */
  size?: OrbSize;
  className?: string;
};

/**
 * Branded Agent C thinking orb — orange-fruit ink via patched `thinking-orbs`.
 * State changes crossfade so modes morph instead of hard-cutting.
 */
export function AgentOrb({
  state = "breathing",
  size = 20,
  speed = 1,
  paused = false,
  className,
  style,
  "aria-label": ariaLabel,
  ...rest
}: AgentOrbProps) {
  const displayPx = size === 64 ? 64 : AGENT_ORB_DISPLAY_PX;
  const reduceMotion = useReducedMotion();
  const [activeState, setActiveState] = useState(state);

  useEffect(() => {
    setActiveState(state);
  }, [state]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className
      )}
      style={{ height: displayPx, width: displayPx }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.span
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
          exit={reduceMotion ? undefined : { opacity: 0 }}
          initial={reduceMotion ? false : { opacity: 0 }}
          key={activeState}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <ThinkingOrb
            {...rest}
            aria-label={ariaLabel}
            paused={paused}
            size={size}
            speed={speed}
            state={activeState}
            style={{
              ...style,
              height: displayPx,
              width: displayPx,
            }}
            theme="auto"
          />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildChatErrorReport,
  formatChatErrorMessage,
} from "@/components/agent/lib/chat-error-report";
import type { OrbActivity } from "@/components/agent/lib/orb-activity";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import { assignSubagentColors } from "@/components/agent/lib/subagent-color";
import { cn } from "@/lib/utils";
import { AgentPresence } from "./agent-presence";
import { SubagentPill } from "./subagent-pill";

const ENTER_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * The presence column above the composer: one pill per running subagent,
 * stacked over the parent agent's own pill (or an error pill when the turn
 * failed).
 *
 * The parent pill stays anchored at the bottom so it does not move as children
 * come and go — the stack grows upward into the message fade.
 */
export function AgentPresenceStack({
  activity,
  subagents,
  attention = false,
  error,
  threadId,
  onDismissError,
  className,
}: {
  activity: OrbActivity | null;
  subagents: readonly SubagentActivity[];
  /** Blocked on the user — see `AgentPresence`. */
  attention?: boolean;
  error?: Error;
  threadId?: string;
  onDismissError?: () => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const colors = useMemo(() => assignSubagentColors(subagents), [subagents]);
  const [copied, setCopied] = useState(false);

  const showSubagents = Boolean(activity) && subagents.length > 0;
  const showParent = Boolean(activity) || Boolean(error);

  const copyDetails = useCallback(async () => {
    if (!(error && threadId)) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildChatErrorReport(error, threadId)
      );
      setCopied(true);
      toast.success("Error details copied", { duration: 2500 });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard", { duration: 4000 });
    }
  }, [error, threadId]);

  return (
    <div className={cn("flex w-full flex-col items-center gap-1.5", className)}>
      <AnimatePresence initial={false}>
        {showSubagents
          ? subagents.map((subagent) => (
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex w-full justify-center"
                exit={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: 0,
                        scale: 0.96,
                        transition: { duration: 0.2 },
                        y: 4,
                      }
                }
                initial={
                  reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }
                }
                key={subagent.callId}
                layout
                transition={ENTER_TRANSITION}
              >
                <SubagentPill
                  className="max-w-[min(22rem,86vw)]"
                  colorFilter={colors.get(subagent.callId)}
                  subagent={subagent}
                />
              </motion.div>
            ))
          : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showParent ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn("flex justify-center", error ? "w-full" : "w-auto")}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 6 }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
            key={error ? "agent-presence-error" : "agent-presence"}
            layout
            transition={ENTER_TRANSITION}
          >
            <AgentPresence
              attention={attention && !error}
              error={
                error
                  ? {
                      copied,
                      message: formatChatErrorMessage(error),
                      onCopy: copyDetails,
                      onDismiss: () => onDismissError?.(),
                    }
                  : undefined
              }
              label={activity?.label ?? "Thinking…"}
              paused={activity?.state === "listening"}
              state={activity?.state ?? "breathing"}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

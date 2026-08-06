"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { AgentActivityPreview } from "@/components/agent/agent-activity-preview";
import {
  agentLayoutSpring,
  agentRevealEase,
} from "@/components/agent/lib/motion";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import { assignSubagentColors } from "@/components/agent/lib/subagent-color";
import { SubagentPill } from "@/components/agent/subagent-pill";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Running subagents as left-aligned rows in the message feed, standing in for
 * the single opaque "Working via subagent" timeline item.
 *
 * One row per subagent, each showing what that subagent is doing right now.
 * Rows leave as their subagents finish; the delegated work itself lands in the
 * timeline as normal once the handoff tool returns.
 */
export function SubagentActivityRows({
  subagents,
}: {
  subagents: readonly SubagentActivity[];
}) {
  const reduceMotion = useReducedMotion();
  const colors = useMemo(() => assignSubagentColors(subagents), [subagents]);

  if (subagents.length === 0) {
    return null;
  }

  // `MessageContent` clips with `overflow-hidden`, so the row needs a little
  // inset for the pill shadows to land inside it rather than being sheared off.
  return (
    <div className="-mx-1 flex w-full flex-col items-start gap-1 px-1 py-1">
      <AnimatePresence initial={false} mode="popLayout">
        {subagents.map((subagent) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-full"
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 4 }}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            key={subagent.callId}
            layout={!reduceMotion}
            transition={{
              duration: 0.32,
              ease: agentRevealEase,
              layout: agentLayoutSpring,
            }}
          >
            <Popover>
              <PopoverTrigger
                className="max-w-full cursor-pointer text-left"
                render={<button type="button" />}
              >
                <SubagentPill
                  colorFilter={colors.get(subagent.callId)}
                  subagent={subagent}
                />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto border-0 p-0 shadow-none"
                side="top"
              >
                <AgentActivityPreview
                  colorFilter={colors.get(subagent.callId)}
                  label={subagent.label}
                  messages={subagent.messages}
                  state={subagent.state}
                  title={subagent.name}
                />
              </PopoverContent>
            </Popover>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

import type { EveMessage } from "eve/react";
import { CheckCircle2Icon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentActivityPreview } from "@/components/agent/agent-activity-preview";
import type { OrbActivity } from "@/components/agent/lib/orb-activity";
import type { SubagentActivity } from "@/components/agent/lib/subagent-activity";
import { assignSubagentColors } from "@/components/agent/lib/subagent-color";
import { SubagentPill } from "@/components/agent/subagent-pill";
import { AgentOrb } from "@/components/agent/ui/agent-orb";
import type { ChatSidebarSide } from "@/components/sidebar/chat-sidebar-side";
import { cn } from "@/lib/utils";

/** Which pill's preview is open: the parent agent, or a subagent's callId. */
type Expanded = { kind: "agent" } | { kind: "subagent"; callId: string } | null;

const SPRING = { damping: 26, stiffness: 320, type: "spring" } as const;

/** How far each layered card peeks out from behind the one in front. */
const STACK_PEEK_PX = 5;
const STACK_SCALE_STEP = 0.04;
/** Cap the visible layers — beyond this the stack reads as mush. */
const MAX_STACK_LAYERS = 3;
/** How long the dock lingers after a turn settles, so the finish is seen. */
const SETTLE_LINGER_MS = 6000;

/**
 * Grace period before the stack collapses.
 *
 * The fanned pills are separate elements with gaps between them, so travelling
 * from one to the next leaves the hover surface for a frame or two. Without a
 * delay the stack starts folding under the cursor mid-move.
 */
const HOVER_GRACE_MS = 260;

function useHoverGrace(setHovered: (value: boolean) => void): {
  open: () => void;
  closeSoon: () => void;
} {
  const timer = useRef<number | undefined>(undefined);

  const cancel = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    closeSoon: useCallback(() => {
      cancel();
      timer.current = window.setTimeout(
        () => setHovered(false),
        HOVER_GRACE_MS
      );
    }, [cancel, setHovered]),
    open: useCallback(() => {
      cancel();
      setHovered(true);
    }, [cancel, setHovered]),
  };
}

/** True for a short window after `busy` goes false. */
function useSettleLinger(busy: boolean): boolean {
  const [settling, setSettling] = useState(false);
  const wasBusy = useRef(busy);

  useEffect(() => {
    if (busy) {
      wasBusy.current = true;
      setSettling(false);
      return;
    }
    if (!wasBusy.current) {
      return;
    }
    wasBusy.current = false;
    setSettling(true);
    const timer = window.setTimeout(() => setSettling(false), SETTLE_LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  return settling;
}

/**
 * Floating agent presence for when the sidebar is closed.
 *
 * A long turn — research subagents, a run of tool calls — often outlives the
 * user's interest in watching it, so they close the sidebar and carry on. This
 * keeps the progress on screen: a single pill in the corner nearest the
 * sidebar, with any running subagents layered behind it, fanning out on hover
 * and expanding into a read-only preview on click.
 */
export function AgentDock({
  activity,
  subagents,
  messages,
  busy,
  needsInput,
  completionSummary,
  side,
  onOpenSidebar,
}: {
  activity: OrbActivity | null;
  subagents: readonly SubagentActivity[];
  messages: readonly EveMessage[];
  busy: boolean;
  /** Turn is blocked on the user — approval, question, or OAuth. */
  needsInput: boolean;
  /** Opening of the final answer, shown once the turn completes. */
  completionSummary?: string;
  side: ChatSidebarSide;
  onOpenSidebar: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState<Expanded>(null);
  const colors = useMemo(() => assignSubagentColors(subagents), [subagents]);
  const settling = useSettleLinger(busy);
  const hover = useHoverGrace(setHovered);

  const closePreview = useCallback(() => setExpanded(null), []);

  // A subagent that finishes mid-preview would otherwise leave an empty shell
  // pinned to the corner, so fall back to the parent rather than blanking.
  const expandedSubagent =
    expanded?.kind === "subagent"
      ? subagents.find((item) => item.callId === expanded.callId)
      : undefined;
  const showingSubagent = expanded?.kind === "subagent" && expandedSubagent;

  // Stay while working, briefly after settling so the finish is visible, and
  // for as long as a preview is open — never yank it out mid-read.
  if (!(busy || settling || expanded)) {
    return null;
  }

  // Hovering only matters while there is a stack to fan out.
  const fanned = (hovered || expanded !== null) && subagents.length > 0;
  const layered = subagents.slice(0, MAX_STACK_LAYERS);
  const hiddenCount = subagents.length - layered.length;

  // Three chip modes. Both terminal ones — blocked and finished — are about
  // getting the user back into the conversation, so they open the sidebar
  // rather than a read-only preview.
  const complete = !busy && Boolean(completionSummary);
  const parentLabel =
    !busy && completionSummary
      ? `${completionSummary}…`
      : (activity?.label ?? (busy ? "Working…" : "Finished"));
  const parentState = activity?.state ?? "breathing";
  const opensSidebar = needsInput || complete;
  const alignClass = side === "right" ? "items-end" : "items-start";

  return (
    // Hover/focus zone for the whole dock. Focus matters as much as hover: the
    // pills are buttons, so tabbing into them fans the stack out the same way.
    // The container itself is a landmark, not a control — giving it an
    // interactive role to satisfy the rule would announce a button that does
    // nothing and bury the real ones inside it.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover zone wrapping the real controls; keyboard parity is provided by onFocus/onBlur
    <section
      aria-label="Agent activity"
      className={cn(
        "pointer-events-none fixed bottom-4 z-50 flex flex-col gap-2",
        alignClass,
        side === "right" ? "right-4" : "left-4"
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHovered(false);
        }
      }}
      onFocus={hover.open}
      onMouseEnter={hover.open}
      onMouseLeave={hover.closeSoon}
    >
      <AnimatePresence>
        {expanded ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="pointer-events-auto origin-bottom"
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97, y: 8 }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
            key="preview"
            transition={SPRING}
          >
            <AgentActivityPreview
              colorFilter={
                showingSubagent
                  ? colors.get(expandedSubagent.callId)
                  : undefined
              }
              label={showingSubagent ? expandedSubagent.label : parentLabel}
              messages={showingSubagent ? expandedSubagent.messages : messages}
              onClose={closePreview}
              onOpenSidebar={onOpenSidebar}
              state={showingSubagent ? expandedSubagent.state : parentState}
              title={showingSubagent ? expandedSubagent.name : "Eve"}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Fanned-out subagents sit above the parent pill; collapsed, they tuck
          behind it as offset cards. While fanned the column itself takes
          pointer events, so the gaps between pills stay part of the hover
          surface and travelling between them never drops the hover. */}
      <div
        className={cn(
          "flex flex-col gap-1.5",
          alignClass,
          fanned ? "pointer-events-auto -m-1 p-1" : "pointer-events-none"
        )}
      >
        <AnimatePresence initial={false}>
          {layered.map((subagent, index) => {
            const depth = layered.length - index;
            return (
              <motion.button
                animate={
                  fanned
                    ? { marginBottom: 0, opacity: 1, scale: 1, y: 0 }
                    : {
                        // Tucked behind the parent: only a sliver shows.
                        marginBottom: -34,
                        opacity: 0.9,
                        scale: 1 - depth * STACK_SCALE_STEP,
                        y: depth * STACK_PEEK_PX,
                      }
                }
                className="pointer-events-auto max-w-[min(20rem,60vw)] origin-bottom cursor-pointer text-left"
                exit={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: 0,
                        scale: 0.96,
                        transition: { duration: 0.18 },
                      }
                }
                initial={
                  reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }
                }
                key={subagent.callId}
                layout
                onClick={() =>
                  setExpanded((current) =>
                    current?.kind === "subagent" &&
                    current.callId === subagent.callId
                      ? null
                      : { callId: subagent.callId, kind: "subagent" }
                  )
                }
                style={{ zIndex: index }}
                transition={reduceMotion ? { duration: 0 } : SPRING}
                type="button"
              >
                <SubagentPill
                  colorFilter={colors.get(subagent.callId)}
                  subagent={subagent}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Parent pill — always the front card, so the corner anchor never moves. */}
        <motion.button
          className={cn(
            "pointer-events-auto relative z-10 inline-flex items-center gap-2.5",
            "max-w-[min(22rem,70vw)] cursor-pointer rounded-full",
            "border py-1.5 pr-3.5 pl-2",
            "bg-[color-mix(in_oklab,var(--card)_92%,var(--background))]",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.08)]",
            // No text weight or colour shift on hover — the label is live and
            // reflowing already; a lift is enough to read as interactive.
            "text-muted-foreground transition-shadow",
            "hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_28px_rgba(0,0,0,0.12)]",
            "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_28px_rgba(0,0,0,0.35)]",
            needsInput && "attention-shimmer border-amber-500/50",
            complete && "border-emerald-500/50",
            !(needsInput || complete) && "border-border/50 dark:border-white/10"
          )}
          layout
          onClick={() => {
            if (opensSidebar) {
              onOpenSidebar();
              return;
            }
            setExpanded((current) =>
              current?.kind === "agent" ? null : { kind: "agent" }
            );
          }}
          transition={reduceMotion ? { duration: 0 } : SPRING}
          type="button"
        >
          {complete ? (
            <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AgentOrb
              aria-label={parentLabel}
              paused={parentState === "listening"}
              state={parentState}
            />
          )}
          <span
            className={cn(
              "min-w-0 truncate text-left font-medium text-xs",
              complete && "text-emerald-700/90 dark:text-emerald-300/90"
            )}
          >
            {parentLabel}
          </span>
          {subagents.length > 0 && !fanned ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
              {subagents.length}
            </span>
          ) : null}
          {hiddenCount > 0 && fanned ? (
            <span className="shrink-0 text-[10px] text-muted-foreground/70">
              +{hiddenCount}
            </span>
          ) : null}
        </motion.button>
      </div>
    </section>
  );
}

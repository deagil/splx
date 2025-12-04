"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ComponentProps } from "react";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Streamdown } from "streamdown";
import { AnimatedMarkdown } from "flowtoken";
import { Shimmer } from "./shimmer";

// ============================================================================
// Types & Context
// ============================================================================

type ReasoningStep = {
  id: string;
  title: string;
  content: string;
};

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
  reasoning: string;
  steps: ReasoningStep[];
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Parse reasoning text into steps based on **bold headers** pattern.
 * Each step has a title (the bold text) and content (text after it).
 */
function parseReasoningSteps(text: string): ReasoningStep[] {
  if (!text.trim()) return [];

  const steps: ReasoningStep[] = [];
  
  // Match **Header** patterns and split content
  // Pattern: **Title**\n\nContent (or **Title**\nContent)
  const headerPattern = /\*\*([^*]+)\*\*/g;
  const matches = [...text.matchAll(headerPattern)];
  
  if (matches.length === 0) {
    // No headers found - treat entire text as single step
    return [{
      id: "step-0",
      title: "",
      content: text.trim(),
    }];
  }
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[1].trim();
    const startIndex = match.index! + match[0].length;
    const endIndex = matches[i + 1]?.index ?? text.length;
    const content = text.slice(startIndex, endIndex).trim();
    
    steps.push({
      id: `step-${i}`,
      title,
      content,
    });
  }
  
  return steps;
}

// ============================================================================
// Components
// ============================================================================

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  /** The raw reasoning text */
  reasoning?: string;
};

const AUTO_CLOSE_DELAY = 800;
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    reasoning = "",
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: undefined,
    });

    const [hasAutoClosed, setHasAutoClosed] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    
    // Parse reasoning into steps
    const steps = useMemo(() => parseReasoningSteps(reasoning), [reasoning]);

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } else if (startTime !== null) {
        setDuration(Math.ceil((Date.now() - startTime) / MS_IN_S));
        setStartTime(null);
      }
    }, [isStreaming, startTime, setDuration]);

    // Auto-close when streaming ends (once only)
    useEffect(() => {
      if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed && reasoning.trim().length > 0) {
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosed(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosed, reasoning]);

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    const contextValue = useMemo(
      () => ({
        isStreaming,
        isOpen,
        setIsOpen,
        duration,
        reasoning,
        steps,
      }),
      [isStreaming, isOpen, setIsOpen, duration, reasoning, steps]
    );

    return (
      <ReasoningContext.Provider value={contextValue}>
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const ReasoningTrigger = memo(
  ({ className, children, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="size-4" />
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.span
                  key="thinking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Shimmer duration={1.5}>Thinking...</Shimmer>
                </motion.span>
              ) : (
                <motion.span
                  key="complete"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {duration !== undefined && duration > 0 
                    ? `Thought for ${duration} second${duration === 1 ? "" : "s"}`
                    : "Thinking complete"
                  }
                </motion.span>
              )}
            </AnimatePresence>
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform duration-200",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children?: string;
};

/**
 * Reasoning content with step-based display:
 * - During streaming: Shows all headers, but only the body text of the latest step
 * - When collapsed: Shows only headers (no body text)
 * - After completion: Shows all headers and all body text
 */
export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const { isStreaming, isOpen, reasoning, steps } = useReasoning();
    
    // Use reasoning from context, fall back to children prop
    const content = reasoning || children || "";
    const hasSteps = steps.length > 0 && steps.some(s => s.title);
    const latestStepIndex = steps.length - 1;

    return (
      <CollapsibleContent
        className={cn(
          "overflow-hidden text-sm",
          "data-[state=closed]:animate-out data-[state=open]:animate-in",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1",
          className
        )}
        {...props}
      >
        <div className="pt-3 pb-1">
          {hasSteps ? (
            // Step-based display with headers
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isLatest = index === latestStepIndex;
                const showContent = isStreaming 
                  ? isLatest && isOpen  // During streaming: only show content for latest step when open
                  : isOpen;              // After streaming: show all content when open
                
                return (
                  <div key={step.id}>
                    {/* Step header - always visible */}
                    {step.title && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "font-medium text-foreground/80",
                          !isLatest && isStreaming && "text-muted-foreground/60"
                        )}
                      >
                        {step.title}
                      </motion.div>
                    )}
                    
                    {/* Step content - conditional display */}
                    <AnimatePresence mode="wait">
                      {showContent && step.content && (
                        <motion.div
                          key={`content-${step.id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ 
                            duration: 0.4, 
                            ease: [0.4, 0, 0.2, 1],
                            opacity: { duration: 0.3 },
                            height: { duration: 0.4, delay: 0.1 }
                          }}
                          className="overflow-hidden"
                        >
                          <div className="pt-1 text-muted-foreground">
                            {isStreaming && isLatest ? (
                              <AnimatedMarkdown
                                content={step.content}
                                animation="fadeIn"
                                animationDuration="0.6s"
                                animationTimingFunction="ease-in-out"
                                sep="word"
                              />
                            ) : (
                              <Streamdown>{step.content}</Streamdown>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            // No headers - show raw content
            <motion.div 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {isStreaming ? (
                <AnimatedMarkdown
                  content={content}
                  animation="fadeIn"
                  animationDuration="0.6s"
                  animationTimingFunction="ease-in-out"
                  sep="word"
                />
              ) : (
                <Streamdown>{content}</Streamdown>
              )}
            </motion.div>
          )}
        </div>
      </CollapsibleContent>
    );
  }
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";

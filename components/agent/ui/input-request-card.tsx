"use client";

import {
  ArrowUpIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { getToolCategoryIcon } from "@/components/agent/lib/tool-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type InputRequestOption = {
  id: string;
  label: string;
  style?: "danger" | "default" | "primary";
  description?: string;
};

export type InputRequestCardProps = {
  title: string;
  description?: string;
  iconCategory?: string;
  statusLabel?: string;
  options?: readonly InputRequestOption[];
  allowFreeform?: boolean;
  freeformPlaceholder?: string;
  respondedWith?: string;
  isPending?: boolean;
  isDenied?: boolean;
  className?: string;
  onSelect: (optionId: string) => void;
  footer?: ReactNode;
};

function optionVariant(
  style: InputRequestOption["style"]
): "primary" | "outline" | "destructive" {
  if (style === "danger") {
    return "destructive";
  }
  if (style === "primary") {
    return "primary";
  }
  return "outline";
}

/**
 * WorkflowCard-inspired prompt for agent questions and approvals.
 * Matches the skewed pastel icon language used by activity steps.
 */
export function InputRequestCard({
  title,
  description,
  iconCategory = "question",
  statusLabel = "Waiting for you",
  options = [],
  allowFreeform = false,
  freeformPlaceholder = "Type a response…",
  respondedWith,
  isPending = true,
  isDenied = false,
  className,
  onSelect,
  footer,
}: InputRequestCardProps) {
  const [freeform, setFreeform] = useState("");
  const [optimisticResponse, setOptimisticResponse] = useState<string | null>(
    null
  );

  const isAnswered = !isPending || Boolean(respondedWith ?? optimisticResponse);
  const displayResponse =
    respondedWith ?? optimisticResponse ?? (isPending ? undefined : "Answered");
  const isInteractive = isPending && !isDenied && !optimisticResponse;

  const handleSelect = (optionId: string) => {
    if (!isInteractive) {
      return;
    }
    const option = options.find((item) => item.id === optionId);
    setOptimisticResponse(option?.label ?? optionId);
    onSelect(optionId);
  };

  return (
    <div
      className={cn(
        "not-prose w-full max-w-md overflow-hidden rounded-2xl p-4 ring-1 transition-colors",
        isAnswered || isDenied
          ? "bg-muted/25 ring-border/40"
          : "bg-muted/40 ring-border/60",
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 shadow-sm",
            (isAnswered || isDenied) && "opacity-70"
          )}
          style={{ rotate: "-8deg" }}
        >
          {getToolCategoryIcon(iconCategory, { size: 18 })}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1",
            isDenied
              ? "bg-destructive/10 text-destructive ring-destructive/20"
              : isAnswered
                ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400"
                : "bg-background/80 text-muted-foreground ring-border/50"
          )}
        >
          {isDenied ? (
            <XCircleIcon className="size-3" />
          ) : isAnswered ? (
            <CheckCircle2Icon className="size-3" />
          ) : (
            <ClockIcon className="size-3 text-amber-600 dark:text-amber-400" />
          )}
          {isDenied ? "Declined" : isAnswered ? "Answered" : statusLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        <h3
          className={cn(
            "font-semibold text-sm leading-snug",
            isAnswered || isDenied ? "text-foreground/80" : "text-foreground"
          )}
        >
          {title}
        </h3>
        {description ? (
          <p
            className={cn(
              "text-sm leading-relaxed",
              isAnswered || isDenied
                ? "text-muted-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {isAnswered && displayResponse && displayResponse !== "Answered" ? (
        <div className="mt-4 rounded-xl bg-background/70 px-3 py-2.5 ring-1 ring-border/50">
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
            Your response
          </p>
          <p className="mt-1 font-medium text-foreground text-sm">
            {displayResponse}
          </p>
        </div>
      ) : null}

      {isInteractive && options.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {options.map((option) => (
            <Button
              className={cn(
                "h-auto min-h-9 w-full justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-sm",
                option.style === "primary" && "rounded-full"
              )}
              key={option.id}
              onClick={() => handleSelect(option.id)}
              size="sm"
              variant={optionVariant(option.style)}
            >
              <span className="flex flex-col items-start gap-0.5">
                <span>{option.label}</span>
                {option.description ? (
                  <span className="font-normal text-xs opacity-70">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </Button>
          ))}
        </div>
      ) : null}

      {isInteractive && allowFreeform ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = freeform.trim();
            if (!value) {
              return;
            }
            handleSelect(value);
            setFreeform("");
          }}
        >
          <Input
            className="h-9 rounded-full bg-background"
            onChange={(e) => setFreeform(e.target.value)}
            placeholder={freeformPlaceholder}
            value={freeform}
          />
          <Button
            aria-label="Send response"
            className="size-9 shrink-0 rounded-full"
            disabled={!freeform.trim()}
            size="icon"
            type="submit"
            variant="primary"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        </form>
      ) : null}

      {footer ? (
        <div className="mt-3 text-muted-foreground text-xs">{footer}</div>
      ) : null}
    </div>
  );
}

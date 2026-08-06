"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useState } from "react";
import { getToolCategoryIcon } from "@/components/agent/lib/tool-icons";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { cn } from "@/lib/utils";

export interface InputRequestOption {
  description?: string;
  id: string;
  label: string;
  style?: "danger" | "default" | "primary";
}

export interface InputRequestCardProps {
  allowFreeform?: boolean;
  className?: string;
  description?: string;
  footer?: ReactNode;
  freeformPlaceholder?: string;
  iconCategory?: string;
  isDenied?: boolean;
  isPending?: boolean;
  onSelect: (optionId: string) => void;
  options?: readonly InputRequestOption[];
  respondedWith?: string;
  title: string;
}

const ANSWER_NAME = "answer";

/**
 * Agent question / approval prompt built on shadcn Questionnaire.
 * Keeps the skewed pastel tool-category icon used by activity steps.
 */
export function InputRequestCard({
  title,
  description,
  iconCategory = "question",
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
  const [optimisticResponse, setOptimisticResponse] = useState<string | null>(
    null
  );

  const isAnswered = !isPending || Boolean(respondedWith ?? optimisticResponse);
  const displayResponse =
    respondedWith ?? optimisticResponse ?? (isPending ? undefined : "Answered");
  const isInteractive = isPending && !isDenied && !optimisticResponse;
  const isSettling = isAnswered || isDenied;

  const items = [
    {
      choices: options.map((option) => ({ value: option.id })),
      name: ANSWER_NAME,
      required: true,
    },
  ];

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!(isPending && !isDenied && !optimisticResponse)) {
        return;
      }

      const formData = new FormData(event.currentTarget);
      const value = formData.get(ANSWER_NAME);
      if (typeof value !== "string") {
        return;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      const option = options.find((item) => item.id === trimmed);
      setOptimisticResponse(option?.label ?? trimmed);
      onSelect(trimmed);
    },
    [isDenied, isPending, onSelect, optimisticResponse, options]
  );

  const questionText = description ?? title;

  return (
    <div
      className={cn(
        "not-prose w-full max-w-md overflow-hidden rounded-2xl border p-4 transition-colors",
        isSettling
          ? "border-border/50 bg-muted/50"
          : "border-border/60 bg-background shadow-sm",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex shrink-0 shadow-sm",
            isSettling && "opacity-70"
          )}
          style={{ rotate: "-8deg" }}
        >
          {getToolCategoryIcon(iconCategory, { size: 18 })}
        </span>
        <h3
          className={cn(
            "min-w-0 font-semibold text-sm leading-snug",
            isSettling ? "text-foreground/80" : "text-foreground"
          )}
        >
          {title}
        </h3>
      </div>

      {isInteractive ? (
        <Questionnaire className="gap-3" items={items} onSubmit={handleSubmit}>
          <QuestionnaireItem name={ANSWER_NAME} required>
            <QuestionnaireTitle className="sr-only">
              {questionText}
            </QuestionnaireTitle>
            {description ? (
              <QuestionnaireDescription className="text-foreground text-sm leading-relaxed">
                {description}
              </QuestionnaireDescription>
            ) : null}
            <QuestionnaireChoices>
              {options.map((option) => (
                <QuestionnaireChoice
                  className={cn(
                    option.style === "danger" &&
                      "border-destructive/40 text-destructive hover:bg-destructive/5 data-checked:border-destructive/50 data-checked:bg-destructive/10",
                    option.style === "primary" &&
                      "data-checked:border-primary/50 data-checked:bg-primary/10"
                  )}
                  key={option.id}
                  value={option.id}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.description ? (
                    <QuestionnaireChoiceDescription>
                      {option.description}
                    </QuestionnaireChoiceDescription>
                  ) : null}
                </QuestionnaireChoice>
              ))}
              {allowFreeform ? (
                <QuestionnaireInput
                  aria-label="Another answer"
                  placeholder={freeformPlaceholder}
                />
              ) : null}
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
          <QuestionnaireActions className="mt-1">
            <QuestionnaireSubmit size="sm">Confirm</QuestionnaireSubmit>
          </QuestionnaireActions>
        </Questionnaire>
      ) : null}

      {isSettling ? (
        <div className="flex flex-col gap-2">
          {description ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
          {displayResponse && displayResponse !== "Answered" ? (
            <div className="rounded-xl border border-border/40 bg-background/80 px-3 py-2.5">
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                {isDenied ? "Declined" : "Your response"}
              </p>
              <p className="mt-1 font-medium text-foreground/90 text-sm">
                {displayResponse}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {footer ? (
        <div className="mt-3 text-muted-foreground text-xs">{footer}</div>
      ) : null}
    </div>
  );
}

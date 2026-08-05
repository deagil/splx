"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ConversationOption {
  label: string;
  value: string;
}

export interface ConversationQuestionProps {
  message: string;
  onSelect: (value: string) => void;
  options?: ConversationOption[];
}

export function ConversationQuestion({
  message,
  options = [],
  onSelect,
}: ConversationQuestionProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <p className="font-medium text-sm">{message}</p>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              className="w-full justify-start text-left"
              key={index}
              onClick={() => onSelect(option.value)}
              variant="outline"
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ConversationVariantsProps {
  message: string;
  onSelect: (value: string) => void;
  options?: ConversationOption[];
}

export function ConversationVariants({
  message,
  options = [],
  onSelect,
}: ConversationVariantsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (value: string, index: number) => {
    setSelectedIndex(index);
    onSelect(value);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <p className="font-medium text-sm">{message}</p>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              className="w-full justify-between"
              key={index}
              onClick={() => handleSelect(option.value, index)}
              variant={selectedIndex === index ? "primary" : "outline"}
            >
              <span className="flex-1 text-left">{option.label}</span>
              {selectedIndex === index && <Check className="ml-2 h-4 w-4" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ConversationClarificationProps {
  message: string;
  onSubmit: (response: string) => void;
}

export function ConversationClarification({
  message,
  onSubmit,
}: ConversationClarificationProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = formData.get("response") as string;
    if (response?.trim()) {
      onSubmit(response.trim());
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <p className="font-medium text-sm">{message}</p>
      <form className="space-y-2" onSubmit={handleSubmit}>
        <Textarea
          className="min-h-[80px] resize-none"
          name="response"
          placeholder="Type your response here..."
          required
        />
        <Button className="w-full" size="sm" type="submit">
          Submit
        </Button>
      </form>
    </div>
  );
}

export interface GeneratedPreviewProps {
  body?: React.ReactNode;
  primaryAction: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    loadingLabel?: string;
    isLoading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  };
  subtitle?: string;
  title: string;
}

export function GeneratedPreview({
  title,
  subtitle,
  body,
  primaryAction,
  secondaryAction,
}: GeneratedPreviewProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-gradient-to-br from-primary/5 via-primary/2 to-primary/5 p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          {!!subtitle && (
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
              {subtitle}
            </span>
          )}
        </div>
        {!!body && (
          <div className="rounded border bg-background p-3 text-xs">{body}</div>
        )}
      </div>
      <div className="flex gap-2">
        {!!secondaryAction && (
          <Button
            className="flex-1"
            disabled={secondaryAction.disabled || primaryAction.isLoading}
            onClick={secondaryAction.onClick}
            size="sm"
            variant="outline"
          >
            {secondaryAction.icon}
            {!!secondaryAction.icon && <span className="mr-2" />}
            {secondaryAction.label}
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={primaryAction.isLoading}
          onClick={primaryAction.onClick}
          size="sm"
        >
          {primaryAction.isLoading ? (
            (primaryAction.loadingLabel ?? "Saving...")
          ) : (
            <>
              {primaryAction.icon ?? <Sparkles className="mr-2 h-3 w-3" />}
              {primaryAction.label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Sparkles } from "lucide-react";

export type ConversationOption = {
  label: string;
  value: string;
};

export type ConversationQuestionProps = {
  message: string;
  options?: ConversationOption[];
  onSelect: (value: string) => void;
};

export function ConversationQuestion({
  message,
  options = [],
  onSelect,
}: ConversationQuestionProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">{message}</p>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left"
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export type ConversationVariantsProps = {
  message: string;
  options?: ConversationOption[];
  onSelect: (value: string) => void;
};

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
      <p className="text-sm font-medium">{message}</p>
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <Button
              key={index}
              variant={selectedIndex === index ? "primary" : "outline"}
              className="w-full justify-between"
              onClick={() => handleSelect(option.value, index)}
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

export type ConversationClarificationProps = {
  message: string;
  onSubmit: (response: string) => void;
};

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
      <p className="text-sm font-medium">{message}</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          name="response"
          placeholder="Type your response here..."
          className="min-h-[80px] resize-none"
          required
        />
        <Button type="submit" size="sm" className="w-full">
          Submit
        </Button>
      </form>
    </div>
  );
}

export type GeneratedPreviewProps = {
  title: string;
  subtitle?: string;
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
};

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
          <h4 className="text-sm font-semibold">{title}</h4>
          {subtitle && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
        {body && <div className="rounded border bg-background p-3 text-xs">{body}</div>}
      </div>
      <div className="flex gap-2">
        {secondaryAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled || primaryAction.isLoading}
            className="flex-1"
          >
            {secondaryAction.icon}
            {secondaryAction.icon && <span className="mr-2" />}
            {secondaryAction.label}
          </Button>
        )}
        <Button
          size="sm"
          onClick={primaryAction.onClick}
          disabled={primaryAction.isLoading}
          className="flex-1"
        >
          {primaryAction.isLoading ? (
            primaryAction.loadingLabel ?? "Saving..."
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





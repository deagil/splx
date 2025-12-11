"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type WizardInputProps = {
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  className?: string;
  minLength?: number;
  maxLength?: number;
};

export function WizardInput({
  placeholder = "Describe what you want to create...",
  submitLabel = "Start with AI",
  onSubmit,
  disabled = false,
  className,
  minLength = 1,
  maxLength = 2000,
}: WizardInputProps) {
  const [value, setValue] = useState("");

  const isValid = value.trim().length >= minLength && value.length <= maxLength;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isValid && !disabled) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[120px] resize-none"
        maxLength={maxLength}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {value.length > 0 && `${value.length}/${maxLength}`}
        </span>
        <Button type="submit" disabled={disabled || !isValid} size="sm">
          <Sparkles className="mr-2 h-3 w-3" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

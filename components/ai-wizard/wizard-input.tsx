"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface WizardInputProps {
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  minLength?: number;
  onSubmit: (value: string) => void;
  placeholder?: string;
  submitLabel?: string;
}

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
    <form className={cn("space-y-3", className)} onSubmit={handleSubmit}>
      <Textarea
        className="min-h-[120px] resize-none"
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={value}
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {value.length > 0 && `${value.length}/${maxLength}`}
        </span>
        <Button disabled={disabled || !isValid} size="sm" type="submit">
          <Sparkles className="mr-2 h-3 w-3" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

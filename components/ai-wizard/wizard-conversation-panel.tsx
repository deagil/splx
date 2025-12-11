"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type WizardConversationPanelProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onCancel?: () => void;
  className?: string;
};

export function WizardConversationPanel({
  title,
  description,
  children,
  footer,
  onCancel,
  className,
}: WizardConversationPanelProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border bg-background p-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content - Single active step */}
      <div className="flex-1 overflow-y-auto p-6">{children}</div>

      {/* Footer - Input area */}
      {footer && (
        <div className="border-t border-border bg-background p-6">{footer}</div>
      )}
    </div>
  );
}

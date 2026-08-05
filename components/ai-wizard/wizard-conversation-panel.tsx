"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardConversationPanelProps {
  children: React.ReactNode;
  className?: string;
  description?: string;
  footer?: React.ReactNode;
  onCancel?: () => void;
  title: string;
}

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
      <div className="flex items-start justify-between border-border border-b bg-background p-6">
        <div className="flex-1">
          <h2 className="font-semibold text-xl">{title}</h2>
          {!!description && (
            <p className="mt-1 text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {!!onCancel && (
          <Button
            className="h-8 w-8 shrink-0"
            onClick={onCancel}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content - Single active step */}
      <div className="flex-1 overflow-y-auto p-6">{children}</div>

      {/* Footer - Input area */}
      {!!footer && (
        <div className="border-border border-t bg-background p-6">{footer}</div>
      )}
    </div>
  );
}

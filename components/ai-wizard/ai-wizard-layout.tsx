"use client";

import { cn } from "@/lib/utils";

type AIWizardLayoutProps = {
  conversationPanel: React.ReactNode;
  previewPanel: React.ReactNode;
  className?: string;
};

export function AIWizardLayout({
  conversationPanel,
  previewPanel,
  className,
}: AIWizardLayoutProps) {
  return (
    <div
      className={cn(
        "flex h-[calc(100vh-4rem)] flex-col overflow-hidden lg:flex-row",
        className
      )}
    >
      {/* Left Panel - Conversation (normal column on main background) */}
      <div className="flex h-1/2 w-full flex-col overflow-hidden lg:h-full lg:w-1/2">
        {conversationPanel}
      </div>

      {/* Right Panel - Preview (grey rounded inset container) */}
      <div className="h-1/2 w-full overflow-hidden lg:h-full lg:flex-1 lg:p-6">
        <div className="h-full w-full overflow-hidden rounded-xl bg-muted/30">
          {previewPanel}
        </div>
      </div>
    </div>
  );
}

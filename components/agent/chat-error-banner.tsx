"use client";

import { AlertTriangleIcon, CopyIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  buildChatErrorReport,
  formatChatErrorMessage,
} from "@/components/agent/lib/chat-error-report";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertToolbar,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { chatInputColumnClass } from "./chat-layout";

export function ChatErrorBanner({
  error,
  threadId,
}: {
  error: Error | undefined;
  threadId: string;
}) {
  const [dismissedError, setDismissedError] = useState<Error | undefined>(
    undefined
  );
  const [copied, setCopied] = useState(false);

  if (!error || error === dismissedError) {
    return null;
  }

  async function copyDetails() {
    if (!error) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildChatErrorReport(error, threadId)
      );
      setCopied(true);
      toast.success("Error details copied", { duration: 2500 });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard", { duration: 4000 });
    }
  }

  return (
    <div className="pb-2">
      <div className={chatInputColumnClass}>
        <Alert appearance="light" variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{formatChatErrorMessage(error)}</AlertDescription>
          <AlertToolbar>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => void copyDetails()}
                size="sm"
                type="button"
                variant="ghost"
              >
                <CopyIcon />
                {copied ? "Copied" : "Copy details"}
              </Button>
              <Button
                onClick={() => setDismissedError(error)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </div>
          </AlertToolbar>
        </Alert>
      </div>
    </div>
  );
}

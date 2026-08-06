"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { MessageActions, MessageToolbar } from "@/components/agent/ui/message";
import { cn } from "@/lib/utils";

const footerActionClassName =
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50";

/**
 * Actions under a finished assistant message.
 *
 * Agent C also rendered a Sources popover and a thread-highlight (feedback)
 * button here. Both were tied to its citation and feedback tables and did not
 * come over, leaving Copy.
 */
export function MessageFooter({
  markdown,
  className,
}: {
  className?: string;
  markdown: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!markdown) {
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  };

  return (
    <MessageToolbar className={cn("mt-2 justify-start gap-1", className)}>
      <MessageActions>
        <button
          className={footerActionClassName}
          disabled={!markdown}
          onClick={() => void handleCopy()}
          type="button"
        >
          {copied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          <span className="font-medium">{copied ? "Copied" : "Copy"}</span>
        </button>
      </MessageActions>
    </MessageToolbar>
  );
}

"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LinkSafetyModalProps } from "streamdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Streamdown's default link-safety modal renders inline next to the link.
 * Inside markdown paragraphs that produces invalid `<p><div>` nesting and
 * hydration errors. Portaling to `document.body` keeps the modal out of `<p>`.
 */
export function StreamdownLinkSafetyModal({
  url,
  isOpen,
  onClose,
  onConfirm,
}: LinkSafetyModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ].filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen, onClose]);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }, [url]);

  const openLink = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      data-streamdown="link-safety-modal"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby="streamdown-link-safety-title"
        aria-modal="true"
        className="relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <Button
          aria-label="Close"
          className="absolute top-4 right-4"
          onClick={onClose}
          ref={closeButtonRef}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-4" />
        </Button>

        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 font-semibold text-lg"
            id="streamdown-link-safety-title"
          >
            <ExternalLinkIcon className="size-5" />
            <span>Open external link?</span>
          </div>
          <p className="text-muted-foreground text-sm">
            You are about to leave this app and open an external website.
          </p>
        </div>

        <div
          className={cn(
            "break-all rounded-md bg-muted p-3 font-mono text-sm",
            url.length > 100 && "max-h-32 overflow-y-auto"
          )}
        >
          {url}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => void copyUrl()}
            type="button"
            variant="outline"
          >
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button className="flex-1" onClick={openLink} type="button">
            Open link
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const streamdownLinkSafety = {
  enabled: true,
  renderModal: (props: LinkSafetyModalProps) => (
    <StreamdownLinkSafetyModal {...props} />
  ),
} as const;

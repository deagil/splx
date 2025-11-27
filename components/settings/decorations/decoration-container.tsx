"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DecorationContainerProps = {
  children: ReactNode;
  className?: string;
  /** Show gradient fades on edges (default: true) */
  showEdgeFades?: boolean;
};

/**
 * Shared container for settings header decorations.
 * Provides consistent sizing (~64px height), overflow handling,
 * and optional gradient edge fades.
 */
export function DecorationContainer({
  children,
  className,
  showEdgeFades = true,
}: DecorationContainerProps) {
  return (
    <div
      className={cn(
        "relative h-16 w-full max-w-full overflow-hidden rounded-lg",
        className
      )}
    >
      {/* Gradient fades on edges for smooth appearance */}
      {showEdgeFades ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        </>
      ) : null}

      {/* Content wrapper with reduced motion support */}
      <div className="relative h-full w-full motion-reduce:*:!animate-none">
        {children}
      </div>
    </div>
  );
}


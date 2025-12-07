"use client";

import type { CSSProperties, ReactNode } from "react";
import type { GridPosition } from "./types";
import { cn } from "@/lib/utils";

export type ViewBlockProps = {
  id: string;
  type: string;
  position: GridPosition;
  children: ReactNode;
};

export function ViewBlock({
  id,
  type,
  position,
  children,
}: ViewBlockProps) {
  const style: CSSProperties = {
    gridColumn: `span ${Math.max(1, Math.min(position.width, 12))} / span ${Math.max(
      1,
      Math.min(position.width, 12)
    )}`,
    gridRow: `span ${Math.max(1, Math.min(position.height, 12))} / span ${Math.max(
      1,
      Math.min(position.height, 12)
    )}`,
  };

  return (
    <section
      aria-label={`${type} block ${id}`}
      className={cn("flex h-full flex-col min-w-0")}
      style={style}
    >
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}


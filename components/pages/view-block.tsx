"use client";

import type { CSSProperties, ReactNode } from "react";
import type { GridPosition } from "./types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type ViewBlockProps = {
  id: string;
  type: string;
  position: GridPosition;
  children: ReactNode;
  isDragging?: boolean;
  dragDelta?: { x: number; y: number };
};

export function ViewBlock({
  id,
  type,
  position,
  children,
  isDragging,
  dragDelta
}: ViewBlockProps) {
  const columnStart = clamp(position.x + 1, 1, 12);
  const maxWidth = 12 - columnStart + 1;
  const width = clamp(position.width, 1, maxWidth);
  const rowStart = clamp(position.y + 1, 1, Number.POSITIVE_INFINITY);
  const height = clamp(position.height, 1, Number.POSITIVE_INFINITY);

  const style: CSSProperties = {
    gridColumn: `${columnStart} / span ${width}`,
    gridRow: `${rowStart} / span ${height}`,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <motion.section
      layout={!isDragging}
      initial={false}
      aria-label={`${type} block ${id}`}
      className={cn("flex h-full min-h-0 flex-col min-w-0")}
      style={style}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
    >
      <div className="flex flex-1 min-h-0 flex-col">{children}</div>
    </motion.section>
  );
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(max)) {
    return Math.max(min, value);
  }
  return Math.min(Math.max(value, min), max);
}


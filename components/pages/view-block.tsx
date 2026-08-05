"use client";

import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { GridPosition } from "./types";

export interface ViewBlockProps {
  children: ReactNode;
  dragDelta?: { x: number; y: number };
  id: string;
  isDragging?: boolean;
  position: GridPosition;
  type: string;
}

export function ViewBlock({
  id,
  type,
  position,
  children,
  isDragging,
  dragDelta,
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
      aria-label={`${type} block ${id}`}
      className={cn("flex h-full min-h-0 min-w-0 flex-col")}
      initial={false}
      layout={!isDragging}
      style={style}
      transition={{
        damping: 30,
        stiffness: 400,
        type: "spring",
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </motion.section>
  );
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(max)) {
    return Math.max(min, value);
  }
  return Math.min(Math.max(value, min), max);
}

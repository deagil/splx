"use client";

/**
 * Sortable wiring shared by the canvas and the left block list.
 *
 * dnd-kit rather than native HTML5 drag-and-drop because a `draggable` ancestor
 * breaks text selection inside a contenteditable in Firefox and Safari — the
 * canvas is full of them. `setActivatorNodeRef` plus a distance activation
 * constraint keeps drag listeners on the handle only, so typing is never a drag.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";

/** dnd-kit needs globally unique ids, and a block appears in two lists. */
export function namespacedId(
  scope: "canvas" | "list",
  blockId: string
): string {
  return `${scope}:${blockId}`;
}

export function stripNamespace(id: string): string {
  return id.slice(id.indexOf(":") + 1);
}

export function useBlockSortable(id: string) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  return {
    handleProps: { ...attributes, ...listeners },
    handleRef: setActivatorNodeRef,
    isDragging,
    ref: setNodeRef,
    style: {
      // Translate, not Transform: the latter includes scaleX/scaleY, which would
      // visibly distort the email preview mid-drag.
      transform: CSS.Translate.toString(transform),
      transition,
    } satisfies CSSProperties,
  };
}

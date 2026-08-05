"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useScreenSize } from "@/hooks/use-screen-size";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { CHAT_SIDEBAR_SIDE } from "@/components/sidebar/chat-sidebar-side";
import {
  canResizeChatSidebar,
  clampSidebarWidthPx,
  clearRegularWidthPercent,
  setSidebarResizing,
  setSidebarWidthPx,
  writeRegularWidthPercent,
} from "@/components/sidebar/chat-sidebar-resize";

type ChatSidebarResizeHandleProps = {
  isExpandedMode: boolean;
};

export function ChatSidebarResizeHandle({
  isExpandedMode,
}: ChatSidebarResizeHandleProps) {
  const { open } = useSidebar();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { screenSize } = useScreenSize();
  const [isDragging, setIsDragging] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    startX: number;
    startWidthPx: number;
    didMove: boolean;
  } | null>(null);

  const allowed = canResizeChatSidebar({
    open,
    isExpandedMode,
    isArtifactVisible,
    screenSize,
  });

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!allowed) {
      setContainer(null);
      setShowHighlight(false);
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      return;
    }

    const nextContainer = document.querySelector(
      '[data-slot="sidebar-container"]'
    ) as HTMLElement | null;
    setContainer(nextContainer);
  }, [allowed]);

  const clearHighlightDelay = () => {
    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  };

  const handlePointerEnter = () => {
    clearHighlightDelay();
    highlightTimeoutRef.current = window.setTimeout(() => {
      setShowHighlight(true);
      highlightTimeoutRef.current = null;
    }, 80);
  };

  const handlePointerLeave = () => {
    clearHighlightDelay();
    if (!isDragging) {
      setShowHighlight(false);
    }
  };

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      if (Math.abs(deltaX) > 2) {
        dragState.didMove = true;
      }
      const signedDelta = CHAT_SIDEBAR_SIDE === "left" ? deltaX : -deltaX;
      const nextWidthPx = clampSidebarWidthPx(
        dragState.startWidthPx + signedDelta,
        window.innerWidth
      );
      setSidebarWidthPx(nextWidthPx);
    };

    const endDrag = () => {
      const dragState = dragStateRef.current;
      const sidebarWrapper = document.querySelector(
        '[data-slot="sidebar-wrapper"]'
      ) as HTMLElement | null;
      const rawWidth = sidebarWrapper
        ? getComputedStyle(sidebarWrapper).getPropertyValue("--sidebar-width")
        : "";
      const currentWidth = Number.parseFloat(rawWidth);

      if (
        dragState?.didMove &&
        Number.isFinite(currentWidth) &&
        window.innerWidth > 0
      ) {
        const percent = (currentWidth / window.innerWidth) * 100;
        writeRegularWidthPercent(percent);
      }

      dragStateRef.current = null;
      setSidebarResizing(false);
      setIsDragging(false);
      setShowHighlight(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [isDragging]);

  if (!allowed || !container) {
    return null;
  }

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();

    const sidebarWrapper = document.querySelector(
      '[data-slot="sidebar-wrapper"]'
    ) as HTMLElement | null;
    const rawWidth = sidebarWrapper
      ? getComputedStyle(sidebarWrapper).getPropertyValue("--sidebar-width")
      : "";
    const startWidthPx = Number.parseFloat(rawWidth);

    if (!Number.isFinite(startWidthPx)) {
      return;
    }

    dragStateRef.current = {
      startX: event.clientX,
      startWidthPx,
      didMove: false,
    };
    setSidebarResizing(true);
    setIsDragging(true);
    setShowHighlight(true);
    clearHighlightDelay();
  };

  const resetWidth = () => {
    clearRegularWidthPercent();
  };

  return createPortal(
    <button
      aria-label="Resize chat sidebar"
      aria-orientation="vertical"
      className={cn(
        "absolute inset-y-0 z-30 hidden w-5 touch-none md:block",
        "border-0 bg-transparent p-0",
        // Sit on the outer container edge and spill into the void between
        // the chat panel and main content (inset gutter).
        "after:absolute after:top-2 after:bottom-2 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full",
        "after:bg-transparent after:transition-colors",
        showHighlight || isDragging
          ? "cursor-col-resize after:bg-border"
          : "cursor-default",
        CHAT_SIDEBAR_SIDE === "left"
          ? "right-1 translate-x-1/2"
          : "left-1 -translate-x-1/2"
      )}
      onDoubleClick={resetWidth}
      onPointerDown={startDrag}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      type="button"
    />,
    container
  );
}

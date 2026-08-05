"use client";

import { useEffect, useState } from "react";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useSidebar } from "@/components/ui/sidebar";
import { useScreenSize } from "@/hooks/use-screen-size";
import {
  REM_TO_PX,
  SIDEBAR_WIDTH_REGULAR_CHANGED_EVENT,
  resolveRegularDesktopWidthPx,
  setSidebarWidthPx,
} from "@/components/sidebar/chat-sidebar-resize";

const CHAT_WIDTH_REM = 30;
const ARTIFACT_WIDTH_REM = 30;
const COMBINED_WIDTH_REM = CHAT_WIDTH_REM + ARTIFACT_WIDTH_REM;

const LAPTOP_SIDEBAR_WITH_ARTIFACT_PERCENT = 66;
const LAPTOP_EXPANDED_NO_ARTIFACT_PERCENT = 60;
const LARGE_DESKTOP_WITH_ARTIFACT_MAX_PERCENT = 50;
const EXPANDED_MODE_PERCENT_LAPTOP = 100;
const EXPANDED_MODE_PERCENT_LARGE_DESKTOP = 66;

const EXPANDED_MODE_STORAGE_KEY = "sidebar-expanded-mode";

export function SidebarWidthManager() {
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setOpen, open } = useSidebar();
  const { screenSize, width } = useScreenSize();
  const [isExpandedMode, setIsExpandedMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(EXPANDED_MODE_STORAGE_KEY);
    if (stored === "true") {
      setIsExpandedMode(true);
    }
  }, []);

  useEffect(() => {
    const handleExpandedToggle = (event: CustomEvent<boolean>) => {
      setIsExpandedMode(event.detail);
      localStorage.setItem(
        EXPANDED_MODE_STORAGE_KEY,
        event.detail ? "true" : "false"
      );
    };

    window.addEventListener(
      "sidebar-expanded-toggle",
      handleExpandedToggle as EventListener
    );

    return () => {
      window.removeEventListener(
        "sidebar-expanded-toggle",
        handleExpandedToggle as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (isArtifactVisible && !open) {
      setOpen(true);
    }
  }, [isArtifactVisible, open, setOpen]);

  useEffect(() => {
    const updateWidth = () => {
      const sidebarWrapper = document.querySelector(
        '[data-slot="sidebar-wrapper"]'
      ) as HTMLElement | null;
      if (!sidebarWrapper || !width) {
        return;
      }

      // Don't fight an in-progress drag.
      if (sidebarWrapper.getAttribute("data-sidebar-resizing") === "true") {
        return;
      }

      let widthPx: number;

      if (isExpandedMode) {
        if (screenSize === "large-desktop") {
          widthPx = width * (EXPANDED_MODE_PERCENT_LARGE_DESKTOP / 100);
        } else if (screenSize === "laptop") {
          if (isArtifactVisible) {
            widthPx = width * (EXPANDED_MODE_PERCENT_LAPTOP / 100);
          } else {
            widthPx = width * (LAPTOP_EXPANDED_NO_ARTIFACT_PERCENT / 100);
          }
        } else {
          widthPx = width * 0.9;
        }
      } else if (screenSize === "large-desktop") {
        if (isArtifactVisible) {
          widthPx = width * (LARGE_DESKTOP_WITH_ARTIFACT_MAX_PERCENT / 100);
        } else {
          widthPx = resolveRegularDesktopWidthPx(width, "large-desktop");
        }
      } else if (screenSize === "laptop") {
        if (isArtifactVisible) {
          const targetWidthPx =
            width * (LAPTOP_SIDEBAR_WITH_ARTIFACT_PERCENT / 100);
          const combinedWidthPx = COMBINED_WIDTH_REM * REM_TO_PX;
          widthPx = Math.min(combinedWidthPx, targetWidthPx);
        } else {
          widthPx = resolveRegularDesktopWidthPx(width, "laptop");
        }
      } else if (isArtifactVisible) {
        const combinedWidthPx = COMBINED_WIDTH_REM * REM_TO_PX;
        widthPx = Math.min(combinedWidthPx, width * 0.9);
      } else {
        widthPx = CHAT_WIDTH_REM * REM_TO_PX;
      }

      setSidebarWidthPx(widthPx);

      if (
        open &&
        isExpandedMode &&
        isArtifactVisible &&
        screenSize === "laptop"
      ) {
        sidebarWrapper.setAttribute("data-expanded-laptop", "true");
      } else {
        sidebarWrapper.removeAttribute("data-expanded-laptop");
      }
    };

    updateWidth();

    window.addEventListener("resize", updateWidth);
    window.addEventListener(SIDEBAR_WIDTH_REGULAR_CHANGED_EVENT, updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
      window.removeEventListener(
        SIDEBAR_WIDTH_REGULAR_CHANGED_EVENT,
        updateWidth
      );
    };
  }, [isArtifactVisible, screenSize, width, isExpandedMode, open]);

  return null;
}

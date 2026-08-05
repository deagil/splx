import type { ScreenSize } from "@/hooks/use-screen-size";

export const SIDEBAR_WIDTH_PERCENT_REGULAR_KEY =
  "sidebar-width-percent-regular";
export const SIDEBAR_WIDTH_REGULAR_CHANGED_EVENT =
  "sidebar-width-regular-changed";

export const REM_TO_PX = 16;
export const MIN_SIDEBAR_REM = 20;
export const MAX_SIDEBAR_REM = 40;
export const MAX_SIDEBAR_VIEWPORT_PERCENT = 42;
export const MAIN_FLOOR_REM = 26;

const CHAT_WIDTH_REM = 30;
const LAPTOP_SIDEBAR_WIDTH_PERCENT = 33;
const LARGE_DESKTOP_MAX_PERCENT = 33.33;

export interface ChatSidebarResizeContext {
  isArtifactVisible: boolean;
  isExpandedMode: boolean;
  open: boolean;
  screenSize: ScreenSize;
}

export function canResizeChatSidebar({
  open,
  isExpandedMode,
  isArtifactVisible,
  screenSize,
}: ChatSidebarResizeContext): boolean {
  return (
    open &&
    !isExpandedMode &&
    !isArtifactVisible &&
    (screenSize === "laptop" || screenSize === "large-desktop")
  );
}

export function getRegularResizeBounds(viewportWidth: number): {
  minPx: number;
  maxPx: number;
} {
  const minPx = MIN_SIDEBAR_REM * REM_TO_PX;
  const maxByPercent = viewportWidth * (MAX_SIDEBAR_VIEWPORT_PERCENT / 100);
  const maxByRem = MAX_SIDEBAR_REM * REM_TO_PX;
  const maxByMainFloor = viewportWidth - MAIN_FLOOR_REM * REM_TO_PX;
  const maxPx = Math.max(
    minPx,
    Math.min(maxByPercent, maxByRem, maxByMainFloor)
  );
  return { maxPx, minPx };
}

export function clampSidebarWidthPx(
  widthPx: number,
  viewportWidth: number
): number {
  const { minPx, maxPx } = getRegularResizeBounds(viewportWidth);
  return Math.min(maxPx, Math.max(minPx, widthPx));
}

export function getDefaultRegularDesktopWidthPx(
  viewportWidth: number,
  screenSize: "laptop" | "large-desktop"
): number {
  const chatWidthPx = CHAT_WIDTH_REM * REM_TO_PX;
  if (screenSize === "large-desktop") {
    const targetWidthPx = viewportWidth * (LARGE_DESKTOP_MAX_PERCENT / 100);
    return Math.min(chatWidthPx, targetWidthPx);
  }
  const targetWidthPx = viewportWidth * (LAPTOP_SIDEBAR_WIDTH_PERCENT / 100);
  return Math.min(chatWidthPx, targetWidthPx);
}

export function readRegularWidthPercent(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(SIDEBAR_WIDTH_PERCENT_REGULAR_KEY);
  if (stored === null) {
    return null;
  }
  const percent = Number.parseFloat(stored);
  if (!Number.isFinite(percent) || percent <= 0) {
    return null;
  }
  return percent;
}

export function writeRegularWidthPercent(percent: number): void {
  localStorage.setItem(SIDEBAR_WIDTH_PERCENT_REGULAR_KEY, String(percent));
  window.dispatchEvent(new CustomEvent(SIDEBAR_WIDTH_REGULAR_CHANGED_EVENT));
}

export function clearRegularWidthPercent(): void {
  localStorage.removeItem(SIDEBAR_WIDTH_PERCENT_REGULAR_KEY);
  window.dispatchEvent(new CustomEvent(SIDEBAR_WIDTH_REGULAR_CHANGED_EVENT));
}

export function resolveRegularDesktopWidthPx(
  viewportWidth: number,
  screenSize: "laptop" | "large-desktop"
): number {
  const overridePercent = readRegularWidthPercent();
  if (overridePercent !== null) {
    return clampSidebarWidthPx(
      viewportWidth * (overridePercent / 100),
      viewportWidth
    );
  }
  return getDefaultRegularDesktopWidthPx(viewportWidth, screenSize);
}

export function getSidebarWrapper(): HTMLElement | null {
  return document.querySelector(
    '[data-slot="sidebar-wrapper"]'
  ) as HTMLElement | null;
}

export function setSidebarWidthPx(widthPx: number): void {
  const sidebarWrapper = getSidebarWrapper();
  if (!sidebarWrapper) {
    return;
  }
  sidebarWrapper.style.setProperty("--sidebar-width", `${widthPx}px`);
}

export function setSidebarResizing(isResizing: boolean): void {
  const sidebarWrapper = getSidebarWrapper();
  if (!sidebarWrapper) {
    return;
  }
  if (isResizing) {
    sidebarWrapper.setAttribute("data-sidebar-resizing", "true");
  } else {
    sidebarWrapper.removeAttribute("data-sidebar-resizing");
  }
}

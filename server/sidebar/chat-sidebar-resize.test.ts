import { describe, expect, it } from "vitest";
import {
  canResizeChatSidebar,
  clampSidebarWidthPx,
  getDefaultRegularDesktopWidthPx,
  getRegularResizeBounds,
} from "@/components/sidebar/chat-sidebar-resize";

describe("chat sidebar resize guardrails", () => {
  it("allows resize only in regular desktop mode without artifact", () => {
    expect(
      canResizeChatSidebar({
        isArtifactVisible: false,
        isExpandedMode: false,
        open: true,
        screenSize: "laptop",
      })
    ).toBe(true);

    expect(
      canResizeChatSidebar({
        isArtifactVisible: false,
        isExpandedMode: false,
        open: true,
        screenSize: "large-desktop",
      })
    ).toBe(true);

    expect(
      canResizeChatSidebar({
        isArtifactVisible: false,
        isExpandedMode: true,
        open: true,
        screenSize: "laptop",
      })
    ).toBe(false);

    expect(
      canResizeChatSidebar({
        isArtifactVisible: true,
        isExpandedMode: false,
        open: true,
        screenSize: "laptop",
      })
    ).toBe(false);

    expect(
      canResizeChatSidebar({
        isArtifactVisible: false,
        isExpandedMode: false,
        open: true,
        screenSize: "mobile",
      })
    ).toBe(false);

    expect(
      canResizeChatSidebar({
        isArtifactVisible: false,
        isExpandedMode: false,
        open: false,
        screenSize: "laptop",
      })
    ).toBe(false);
  });

  it("clamps width between min, max percent/rem, and main floor", () => {
    const viewportWidth = 1440;
    const { minPx, maxPx } = getRegularResizeBounds(viewportWidth);

    expect(minPx).toBe(320);
    // min(42% of 1440 = 604.8, 40rem = 640, main floor = 1440 - 416 = 1024)
    expect(maxPx).toBeCloseTo(604.8);

    expect(clampSidebarWidthPx(100, viewportWidth)).toBe(320);
    expect(clampSidebarWidthPx(900, viewportWidth)).toBeCloseTo(604.8);
    expect(clampSidebarWidthPx(400, viewportWidth)).toBe(400);
  });

  it("keeps default regular widths under the historical caps", () => {
    expect(getDefaultRegularDesktopWidthPx(1440, "laptop")).toBe(
      Math.min(480, 1440 * 0.33)
    );
    expect(getDefaultRegularDesktopWidthPx(2560, "large-desktop")).toBe(
      Math.min(480, 2560 * (33.33 / 100))
    );
  });
});

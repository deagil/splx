"use client";

import { useEffect, useState } from "react";

/**
 * Mock mode: swaps the sidebar's live Eve session for the scripted harness.
 *
 * Enabled by `?agentMock=1` (or `?agentMock=<scenario-id>`) on any app URL,
 * then remembered in `sessionStorage` so navigating around keeps it on. Never
 * available in a production build.
 */

const STORAGE_KEY = "splx.agent-mock";
const SCENARIO_KEY = "splx.agent-mock.scenario";
const CHANGED_EVENT = "splx:agent-mock-changed";

export const MOCK_MODE_AVAILABLE = process.env.NODE_ENV !== "production";

function readStored(): { enabled: boolean; scenarioId: string | null } {
  if (typeof window === "undefined") {
    return { enabled: false, scenarioId: null };
  }
  try {
    return {
      enabled: window.sessionStorage.getItem(STORAGE_KEY) === "1",
      scenarioId: window.sessionStorage.getItem(SCENARIO_KEY),
    };
  } catch {
    return { enabled: false, scenarioId: null };
  }
}

function write(enabled: boolean, scenarioId?: string | null): void {
  try {
    if (enabled) {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      if (scenarioId) {
        window.sessionStorage.setItem(SCENARIO_KEY, scenarioId);
      }
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(SCENARIO_KEY);
    }
  } catch {
    // Private mode / storage disabled — mock mode just won't persist.
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function disableAgentMockMode(): void {
  write(false);
}

/**
 * Reads mock mode on the client only, so the server render and the first
 * client render agree (both "off") and hydration stays clean.
 */
export function useAgentMockMode(): {
  enabled: boolean;
  scenarioId: string | null;
} {
  const [state, setState] = useState<{
    enabled: boolean;
    scenarioId: string | null;
  }>({ enabled: false, scenarioId: null });

  useEffect(() => {
    if (!MOCK_MODE_AVAILABLE) {
      return;
    }

    // `?agentMock=<scenario-id>` opens on that scenario; `1` uses the default.
    const param = new URLSearchParams(window.location.search).get("agentMock");
    if (param !== null) {
      const off = param === "0" || param === "false";
      const named = off || param === "1" || param === "" ? null : param;
      write(!off, named);
    }

    const sync = () => setState(readStored());
    sync();

    window.addEventListener(CHANGED_EVENT, sync);
    return () => window.removeEventListener(CHANGED_EVENT, sync);
  }, []);

  return state;
}

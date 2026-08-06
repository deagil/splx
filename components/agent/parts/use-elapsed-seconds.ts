"use client";

import { useEffect, useRef, useState } from "react";

const MS_IN_S = 1000;

/**
 * Live elapsed seconds while `active` is true; freezes the final value when
 * activity ends (client-side, current session only).
 *
 * Pass `resetKey` (e.g. tool label) to restart the clock when the active
 * work item changes without `active` flipping false.
 */
export function useElapsedSeconds(
  active: boolean,
  resetKey?: string
): number | undefined {
  const [elapsed, setElapsed] = useState<number | undefined>(undefined);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      startTimeRef.current = Date.now();
      setElapsed(0);

      const id = window.setInterval(() => {
        if (startTimeRef.current === null) {
          return;
        }
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / MS_IN_S));
      }, MS_IN_S);

      return () => window.clearInterval(id);
    }

    if (startTimeRef.current !== null) {
      setElapsed(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
      startTimeRef.current = null;
    }
  }, [active, resetKey]);

  return elapsed;
}

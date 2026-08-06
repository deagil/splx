"use client";

import { useSyncExternalStore } from "react";

const STREAM_LOG_MAX = 50;

interface StreamLogEntry {
  at: number;
  type: string;
}

let streamLog: StreamLogEntry[] = [];
let turnEventCounts: Record<string, number> = {};
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function recordStreamEvent(type: string) {
  streamLog = [{ at: Date.now(), type }, ...streamLog].slice(0, STREAM_LOG_MAX);
  turnEventCounts = {
    ...turnEventCounts,
    [type]: (turnEventCounts[type] ?? 0) + 1,
  };
  emit();
}

/** Snapshot for error reports (clipboard / toast). */
export function getStreamLogSnapshot() {
  return {
    streamLog: streamLog.slice(),
    turnEventCounts: { ...turnEventCounts },
  };
}

export function resetTurnEventCounts() {
  turnEventCounts = {};
  emit();
}

export function resetStreamLog() {
  streamLog = [];
  resetTurnEventCounts();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStreamLog() {
  const log = useSyncExternalStore(
    subscribe,
    () => streamLog,
    () => streamLog
  );
  const counts = useSyncExternalStore(
    subscribe,
    () => turnEventCounts,
    () => turnEventCounts
  );

  return {
    resetStreamLog,
    resetTurnEventCounts,
    streamLog: log,
    turnEventCounts: counts,
  };
}

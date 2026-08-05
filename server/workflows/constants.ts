export const MAX_WORKFLOW_DEPTH = 5;
export const MAX_SCHEDULE_ATTEMPTS = 5;
export const CLAIM_LEASE_MS = 5 * 60 * 1000;
export const DEFAULT_CLAIM_LIMIT = 25;

/** Exponential backoff: 30s, 2m, 8m, 32m, … capped at 1 hour. */
export function backoffMs(attempts: number): number {
  const base = 30_000;
  const ms = base * 4 ** Math.max(0, attempts - 1);
  return Math.min(ms, 60 * 60 * 1000);
}

export function nextRunAfter(attempts: number, now = new Date()): Date {
  return new Date(now.getTime() + backoffMs(attempts));
}

export const __testing = { backoffMs, nextRunAfter };

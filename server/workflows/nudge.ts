import { waitUntil } from "@vercel/functions";

/**
 * Fire-and-forget nudge so a pending schedule row is usually claimed within a
 * second. Debounced per process so a request that emits three events causes one
 * tick. The scheduled cron/Coolify hit remains the durability net.
 *
 * The worker is imported dynamically to avoid a cycle with emitEvent → nudge →
 * worker → emitEvent.
 */

let pending = false;

async function runTick(): Promise<void> {
  pending = false;
  try {
    const { processDueSchedules } = await import("./worker");
    await processDueSchedules({ limit: 25 });
  } catch (error) {
    console.error("[workflows] tick failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function scheduleTick(): void {
  if (pending) {
    return;
  }
  pending = true;

  if (process.env.VERCEL) {
    waitUntil(runTick());
    return;
  }

  // Self-hosted / Coolify: the Node process is long-lived.
  Promise.resolve()
    .then(() => runTick())
    .catch(() => undefined);
}

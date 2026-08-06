/**
 * Human-readable elapsed time for activity chips and timeline rows.
 *
 * Seconds-only reads fine for a quick tool call but degrades badly on the long
 * runs subagents do — `103s` takes a beat to parse where `1m 3s` does not.
 */
export function formatElapsed(seconds: number | undefined): string | null {
  if (seconds === undefined || seconds < 0) {
    return null;
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes < 60) {
    return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  return remainderMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainderMinutes}m`;
}

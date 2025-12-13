import type { ReleaseNote } from '@/lib/types/releases'

import { release as v040 } from './v0.4.0'

// All releases sorted by date (newest first)
export const releases: ReleaseNote[] = [v040].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
)

/**
 * Get the latest (most recent) release
 */
export function getLatestRelease(): ReleaseNote | undefined {
  return releases[0]
}

/**
 * Find a release by its slug
 */
export function getReleaseBySlug(slug: string): ReleaseNote | undefined {
  return releases.find((r) => r.slug === slug)
}

/**
 * Get all releases except the one with the given slug
 * Useful for showing "past issues" on a release page
 */
export function getPastReleases(excludeSlug?: string): ReleaseNote[] {
  if (!excludeSlug) return releases.slice(1)
  return releases.filter((r) => r.slug !== excludeSlug)
}

/**
 * Get all releases
 */
export function getAllReleases(): ReleaseNote[] {
  return releases
}

/**
 * Format a release date for display
 */
export function formatReleaseDate(
  dateString: string,
  options?: { short?: boolean },
): string {
  const date = new Date(dateString)

  if (options?.short) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    })
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

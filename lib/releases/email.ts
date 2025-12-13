import { render } from '@react-email/render'
import { ReleaseNoteEmail } from '@/components/emails/release-note-email'
import type { ReleaseNote } from '@/lib/types/releases'

/**
 * Render a release note as HTML email
 */
export async function renderReleaseEmail(
  release: ReleaseNote,
  options?: { baseUrl?: string },
): Promise<string> {
  const html = await render(
    ReleaseNoteEmail({
      release,
      baseUrl: options?.baseUrl,
    }),
  )
  return html
}

/**
 * Render a release note as plain text email
 */
export async function renderReleaseEmailText(
  release: ReleaseNote,
  options?: { baseUrl?: string },
): Promise<string> {
  const text = await render(
    ReleaseNoteEmail({
      release,
      baseUrl: options?.baseUrl,
    }),
    { plainText: true },
  )
  return text
}

/**
 * Get the email subject line for a release
 */
export function getEmailSubject(release: ReleaseNote): string {
  return (
    release.emailSubject ??
    `${release.publicationName ?? "What's New"} #${release.issueNumber}: ${release.title}`
  )
}

/**
 * Get the email preview text for a release
 */
export function getEmailPreviewText(release: ReleaseNote): string {
  return (
    release.emailPreviewText ??
    `${release.title} - ${release.publicationName ?? 'Suplex Weekly'}`
  )
}

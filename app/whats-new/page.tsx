import type { Metadata } from 'next'
import { getLatestRelease } from '@/content/releases'
import { ReleaseNotePage } from '@/components/releases/release-note-page'

export default function WhatsNewPage() {
  const release = getLatestRelease()

  if (!release) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No releases yet</p>
      </div>
    )
  }

  return <ReleaseNotePage release={release} />
}

export function generateMetadata(): Metadata {
  const release = getLatestRelease()

  if (!release) {
    return {
      title: "What's New",
      description: 'Latest updates from Suplex',
    }
  }

  return {
    title: `${release.title} | What's New`,
    description: release.emailPreviewText ?? `${release.title} - Suplex Weekly`,
    openGraph: {
      title: release.title,
      description: release.emailPreviewText,
      images: [release.previewImage],
    },
  }
}

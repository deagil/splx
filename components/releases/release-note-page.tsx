import { Suspense } from 'react'
import { HeroHeader } from '@/components/header'
import Footer from '@/components/footer-one'
import ReleaseNotesHeader from '@/components/marketing/release-notes-header'
import ReleaseNotesPast from '@/components/marketing/release-notes-past'
import FloatingVideoPlayer from '@/components/marketing/floating-video-player'
import { ContentBlocksRenderer } from '@/components/releases/content-block-renderer'
import { getPastReleases, formatReleaseDate } from '@/content/releases'
import type { ReleaseNote } from '@/lib/types/releases'

type ReleaseNotePageProps = {
  release: ReleaseNote
}

export function ReleaseNotePage({ release }: ReleaseNotePageProps) {
  const pastReleases = getPastReleases(release.slug)

  // Format past releases for the past issues component
  const pastIssues = pastReleases.slice(0, 3).map((r) => ({
    date: formatReleaseDate(r.date, { short: true }),
    issueNumber: r.issueNumber,
    version: r.appVersion,
    title: r.title,
    previewImage: r.previewImage,
    href: `/whats-new/${r.slug}`,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <HeroHeader />

      <main className="flex-1">
        {/* Release Notes Header */}
        <ReleaseNotesHeader
          date={formatReleaseDate(release.date)}
          location={release.location ?? 'Brooklyn, USA'}
          issueNumber={release.issueNumber}
          appVersion={release.appVersion}
          title={release.title}
          subtitle={release.subtitle}
          publicationName={release.publicationName}
        />

        {/* Main Content */}
        <ContentBlocksRenderer sections={release.sections} />

        {/* Past Issues */}
        {pastIssues.length > 0 && (
          <ReleaseNotesPast issues={pastIssues} viewAllHref="/whats-new" />
        )}
      </main>

      {/* Floating Video Player */}
      {release.author && (
        <FloatingVideoPlayer
          name={release.author.name}
          role={release.author.role}
          avatarSrc={release.author.avatarSrc}
          videoUrl={release.author.videoUrl}
          duration={release.author.videoDuration}
        />
      )}

      <Suspense fallback={<div className="bg-muted py-16" />}>
        <Footer />
      </Suspense>
    </div>
  )
}

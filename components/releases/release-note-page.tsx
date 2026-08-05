import { Suspense } from "react";
import Footer from "@/components/footer-one";
import { HeroHeader } from "@/components/header";
import FloatingVideoPlayer from "@/components/marketing/floating-video-player";
import ReleaseNotesHeader from "@/components/marketing/release-notes-header";
import ReleaseNotesPast from "@/components/marketing/release-notes-past";
import { ContentBlocksRenderer } from "@/components/releases/content-block-renderer";
import { formatReleaseDate, getPastReleases } from "@/content/releases";
import type { ReleaseNote } from "@/lib/types/releases";

interface ReleaseNotePageProps {
  release: ReleaseNote;
}

export function ReleaseNotePage({ release }: ReleaseNotePageProps) {
  const pastReleases = getPastReleases(release.slug);

  // Format past releases for the past issues component
  const pastIssues = pastReleases.slice(0, 3).map((r) => ({
    date: formatReleaseDate(r.date, { short: true }),
    href: `/whats-new/${r.slug}`,
    issueNumber: r.issueNumber,
    previewImage: r.previewImage,
    title: r.title,
    version: r.appVersion,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <HeroHeader />

      <main className="flex-1">
        {/* Release Notes Header */}
        <ReleaseNotesHeader
          appVersion={release.appVersion}
          date={formatReleaseDate(release.date)}
          issueNumber={release.issueNumber}
          location={release.location ?? "Brooklyn, USA"}
          publicationName={release.publicationName}
          subtitle={release.subtitle}
          title={release.title}
        />

        {/* Main Content */}
        <ContentBlocksRenderer sections={release.sections} />

        {/* Past Issues */}
        {pastIssues.length > 0 && (
          <ReleaseNotesPast issues={pastIssues} viewAllHref="/whats-new" />
        )}
      </main>

      {/* Floating Video Player */}
      {!!release.author && (
        <FloatingVideoPlayer
          avatarSrc={release.author.avatarSrc}
          duration={release.author.videoDuration}
          name={release.author.name}
          role={release.author.role}
          videoUrl={release.author.videoUrl}
        />
      )}

      <Suspense fallback={<div className="bg-muted py-16" />}>
        <Footer />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { ReleaseNotePage } from "@/components/releases/release-note-page";
import { getLatestRelease } from "@/content/releases";

export default function WhatsNewPage() {
  const release = getLatestRelease();

  if (!release) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No releases yet</p>
      </div>
    );
  }

  return <ReleaseNotePage release={release} />;
}

export function generateMetadata(): Metadata {
  const release = getLatestRelease();

  if (!release) {
    return {
      description: "Latest updates from Suplex",
      title: "What's New",
    };
  }

  return {
    description: release.emailPreviewText ?? `${release.title} - Suplex Weekly`,
    openGraph: {
      description: release.emailPreviewText,
      images: [release.previewImage],
      title: release.title,
    },
    title: `${release.title} | What's New`,
  };
}

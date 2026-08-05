import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReleaseNotePage } from "@/components/releases/release-note-page";
import { getReleaseBySlug, releases } from "@/content/releases";

interface PageRouteProps {
  params: Promise<{ slug: string }>;
}

export default async function ReleaseSlugPage({ params }: PageRouteProps) {
  const resolvedParams = await params;
  const release = getReleaseBySlug(resolvedParams.slug);

  if (!release) {
    notFound();
  }

  return <ReleaseNotePage release={release} />;
}

export function generateStaticParams() {
  return releases.map((release) => ({
    slug: release.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageRouteProps): Promise<Metadata> {
  const resolvedParams = await params;
  const release = getReleaseBySlug(resolvedParams.slug);

  if (!release) {
    return {
      title: "Release Not Found",
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

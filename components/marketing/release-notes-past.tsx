import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PastIssue {
  date: string;
  href?: string;
  issueNumber: string;
  previewImage?: string;
  title: string;
  version: string;
}

interface ReleaseNotesPastProps {
  className?: string;
  issues: PastIssue[];
  viewAllHref?: string;
}

export default function ReleaseNotesPast({
  issues,
  viewAllHref = "/whats-new",
  className,
}: ReleaseNotesPastProps) {
  return (
    <section className={cn("mx-auto max-w-5xl px-6 py-24", className)}>
      <h2 className="mb-12 text-center font-bold text-3xl text-foreground md:text-4xl">
        Past Issues
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {issues.map((issue, index) => (
          <Link className="group block" href={issue.href ?? "#"} key={index}>
            <Card className="overflow-hidden p-0 transition-all hover:shadow-lg">
              {/* Preview image */}
              {!!issue.previewImage && (
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <Image
                    alt={issue.title}
                    className="object-cover transition-transform group-hover:scale-105"
                    fill
                    src={issue.previewImage}
                  />
                  {/* Browser frame overlay for previews */}
                  <div className="absolute inset-0 border-4 border-background" />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <div className="mb-2 text-muted-foreground text-sm">
                  {issue.date}
                </div>
                <div className="mb-2 text-muted-foreground text-xs">
                  No. {issue.issueNumber} • App {issue.version}
                </div>
                <h3 className="font-semibold text-foreground text-lg transition-colors group-hover:text-primary">
                  {issue.title}
                </h3>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* View all link */}
      <div className="mt-12 text-center">
        <Button asChild size="lg" variant="ghost">
          <Link href={viewAllHref}>
            <span>View All Release Notes +</span>
          </Link>
        </Button>
      </div>
    </section>
  );
}

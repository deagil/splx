import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PastIssue = {
  date: string
  issueNumber: string
  version: string
  title: string
  previewImage?: string
  href?: string
}

type ReleaseNotesPastProps = {
  issues: PastIssue[]
  viewAllHref?: string
  className?: string
}

export default function ReleaseNotesPast({
  issues,
  viewAllHref = '/whats-new',
  className,
}: ReleaseNotesPastProps) {
  return (
    <section className={cn('mx-auto max-w-5xl px-6 py-24', className)}>
      <h2 className="text-foreground mb-12 text-center text-3xl font-bold md:text-4xl">
        Past Issues
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {issues.map((issue, index) => (
          <Link
            key={index}
            href={issue.href ?? '#'}
            className="group block">
            <Card className="overflow-hidden p-0 transition-all hover:shadow-lg">
              {/* Preview image */}
              {issue.previewImage && (
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <Image
                    src={issue.previewImage}
                    alt={issue.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  {/* Browser frame overlay for previews */}
                  <div className="absolute inset-0 border-4 border-background" />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <div className="text-muted-foreground mb-2 text-sm">
                  {issue.date}
                </div>
                <div className="text-muted-foreground mb-2 text-xs">
                  No. {issue.issueNumber} • App {issue.version}
                </div>
                <h3 className="text-foreground group-hover:text-primary text-lg font-semibold transition-colors">
                  {issue.title}
                </h3>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* View all link */}
      <div className="mt-12 text-center">
        <Button
          asChild
          variant="ghost"
          size="lg">
          <Link href={viewAllHref}>
            <span>View All Release Notes +</span>
          </Link>
        </Button>
      </div>
    </section>
  )
}

import Image from 'next/image'
import { cn } from '@/lib/utils'

type MediaContent = {
  type: 'image' | 'gif' | 'video'
  src: string
  alt?: string
  caption?: string
  browserFrame?: boolean
}

type ReleaseNotesContentProps = {
  children?: React.ReactNode
  media?: MediaContent
  className?: string
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background rounded-lg border border-black/10 shadow-lg shadow-black/10 ring-1 ring-black/5">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-black/10 bg-muted/30 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-red-500" />
          <div className="size-3 rounded-full bg-yellow-500" />
          <div className="size-3 rounded-full bg-green-500" />
        </div>
        <div className="bg-background text-muted-foreground ml-2 flex-1 rounded px-3 py-1 text-xs">
          {/* Browser address bar - placeholder */}
        </div>
      </div>
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}

export default function ReleaseNotesContent({
  children,
  media,
  className,
}: ReleaseNotesContentProps) {
  return (
    <article className={cn('mx-auto max-w-7xl px-6', className)}>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {/* Text content - narrower column, left-aligned */}
        {children && (
          <div className="text-foreground mx-auto mb-16 max-w-2xl leading-relaxed">
            {children}
          </div>
        )}

        {/* Media content - wider container than text */}
        {media && (
          <div className="mx-auto my-20 max-w-5xl">
            {media.browserFrame ? (
              <BrowserFrame>
                <MediaRenderer media={media} />
              </BrowserFrame>
            ) : (
              <MediaRenderer media={media} />
            )}
            {media.caption && (
              <p className="text-muted-foreground mt-6 text-center text-sm">
                {media.caption}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function MediaRenderer({ media }: { media: MediaContent }) {
  switch (media.type) {
    case 'image':
    case 'gif':
      return (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={media.src}
            alt={media.alt ?? ''}
            fill
            className="object-contain"
            unoptimized={media.type === 'gif'}
          />
        </div>
      )
    case 'video':
      return (
        <div className="relative aspect-video w-full overflow-hidden">
          <video
            src={media.src}
            className="size-full object-contain"
            controls
            autoPlay
            loop
            muted
          />
        </div>
      )
    default:
      return null
  }
}

import Image from 'next/image'
import type { ContentBlock } from '@/lib/types/releases'
import { cn } from '@/lib/utils'

type ContentBlockRendererProps = {
  block: ContentBlock
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
        <div className="bg-background text-muted-foreground ml-2 flex-1 rounded px-3 py-1 text-xs" />
      </div>
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}

function TextBlockRenderer({
  content,
  variant = 'paragraph',
}: {
  content: string
  variant?: 'paragraph' | 'lead' | 'muted'
}) {
  const variantStyles = {
    paragraph: 'text-foreground text-lg leading-relaxed',
    lead: 'text-foreground text-lg leading-relaxed',
    muted: 'text-muted-foreground text-lg leading-relaxed',
  }

  return <p className={cn('mb-8', variantStyles[variant])}>{content}</p>
}

function HeadingBlockRenderer({
  content,
  level,
}: {
  content: string
  level: 2 | 3
}) {
  if (level === 2) {
    return (
      <h2 className="text-foreground mb-8 text-center text-3xl font-semibold md:text-4xl">
        {content}
      </h2>
    )
  }

  return (
    <h3 className="text-foreground mb-6 text-xl font-semibold md:text-2xl">
      {content}
    </h3>
  )
}

function ListBlockRenderer({ items }: { items: string[] }) {
  return (
    <ul className="text-muted-foreground mb-8 space-y-4 text-lg">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className="text-primary mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function MediaBlockRenderer({
  mediaType,
  src,
  alt,
  caption,
  browserFrame,
}: {
  mediaType: 'image' | 'gif' | 'video'
  src: string
  alt?: string
  caption?: string
  browserFrame?: boolean
}) {
  const mediaContent =
    mediaType === 'video' ? (
      <div className="relative aspect-video w-full overflow-hidden">
        <video
          src={src}
          className="size-full object-contain"
          controls
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    ) : (
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          className="object-contain"
          unoptimized={mediaType === 'gif'}
        />
      </div>
    )

  return (
    <div className="mx-auto my-20 max-w-5xl">
      {browserFrame ? (
        <BrowserFrame>{mediaContent}</BrowserFrame>
      ) : (
        mediaContent
      )}
      {caption && (
        <p className="text-muted-foreground mt-6 text-center text-sm">
          {caption}
        </p>
      )}
    </div>
  )
}

export function ContentBlockRenderer({
  block,
  className,
}: ContentBlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlockRenderer content={block.content} variant={block.variant} />

    case 'heading':
      return <HeadingBlockRenderer content={block.content} level={block.level} />

    case 'list':
      return <ListBlockRenderer items={block.items} />

    case 'media':
      return (
        <MediaBlockRenderer
          mediaType={block.mediaType}
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          browserFrame={block.browserFrame}
        />
      )

    default:
      return null
  }
}

export function ContentBlocksRenderer({
  sections,
  className,
}: {
  sections: ContentBlock[]
  className?: string
}) {
  return (
    <article className={cn('mx-auto max-w-7xl px-6', className)}>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <div className="text-foreground mx-auto max-w-2xl leading-relaxed">
          {sections.map((block, index) => (
            <ContentBlockRenderer key={index} block={block} />
          ))}
        </div>
      </div>
    </article>
  )
}

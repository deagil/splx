import Image from "next/image";
import type { ContentBlock } from "@/lib/types/releases";
import { cn } from "@/lib/utils";

interface ContentBlockRendererProps {
  block: ContentBlock;
  className?: string;
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 bg-background shadow-black/10 shadow-lg ring-1 ring-black/5">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-black/10 border-b bg-muted/30 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-red-500" />
          <div className="size-3 rounded-full bg-yellow-500" />
          <div className="size-3 rounded-full bg-green-500" />
        </div>
        <div className="ml-2 flex-1 rounded bg-background px-3 py-1 text-muted-foreground text-xs" />
      </div>
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}

function TextBlockRenderer({
  content,
  variant = "paragraph",
}: {
  content: string;
  variant?: "paragraph" | "lead" | "muted";
}) {
  const variantStyles = {
    lead: "text-foreground text-lg leading-relaxed",
    muted: "text-muted-foreground text-lg leading-relaxed",
    paragraph: "text-foreground text-lg leading-relaxed",
  };

  return <p className={cn("mb-8", variantStyles[variant])}>{content}</p>;
}

function HeadingBlockRenderer({
  content,
  level,
}: {
  content: string;
  level: 2 | 3;
}) {
  if (level === 2) {
    return (
      <h2 className="mb-8 text-center font-semibold text-3xl text-foreground md:text-4xl">
        {content}
      </h2>
    );
  }

  return (
    <h3 className="mb-6 font-semibold text-foreground text-xl md:text-2xl">
      {content}
    </h3>
  );
}

function ListBlockRenderer({ items }: { items: string[] }) {
  return (
    <ul className="mb-8 space-y-4 text-lg text-muted-foreground">
      {items.map((item, index) => (
        <li className="flex items-start gap-3" key={index}>
          <span className="mt-1 text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MediaBlockRenderer({
  mediaType,
  src,
  alt,
  caption,
  browserFrame,
}: {
  mediaType: "image" | "gif" | "video";
  src: string;
  alt?: string;
  caption?: string;
  browserFrame?: boolean;
}) {
  const mediaContent =
    mediaType === "video" ? (
      <div className="relative aspect-video w-full overflow-hidden">
        <video
          autoPlay
          className="size-full object-contain"
          controls
          loop
          muted
          playsInline
          src={src}
        />
      </div>
    ) : (
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          alt={alt ?? ""}
          className="object-contain"
          fill
          src={src}
          unoptimized={mediaType === "gif"}
        />
      </div>
    );

  return (
    <div className="mx-auto my-20 max-w-5xl">
      {browserFrame ? (
        <BrowserFrame>{mediaContent}</BrowserFrame>
      ) : (
        mediaContent
      )}
      {!!caption && (
        <p className="mt-6 text-center text-muted-foreground text-sm">
          {caption}
        </p>
      )}
    </div>
  );
}

export function ContentBlockRenderer({
  block,
  className,
}: ContentBlockRendererProps) {
  switch (block.type) {
    case "text":
      return (
        <TextBlockRenderer content={block.content} variant={block.variant} />
      );

    case "heading":
      return (
        <HeadingBlockRenderer content={block.content} level={block.level} />
      );

    case "list":
      return <ListBlockRenderer items={block.items} />;

    case "media":
      return (
        <MediaBlockRenderer
          alt={block.alt}
          browserFrame={block.browserFrame}
          caption={block.caption}
          mediaType={block.mediaType}
          src={block.src}
        />
      );

    default:
      return null;
  }
}

export function ContentBlocksRenderer({
  sections,
  className,
}: {
  sections: ContentBlock[];
  className?: string;
}) {
  return (
    <article className={cn("mx-auto max-w-7xl px-6", className)}>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <div className="mx-auto max-w-2xl text-foreground leading-relaxed">
          {sections.map((block, index) => (
            <ContentBlockRenderer block={block} key={index} />
          ))}
        </div>
      </div>
    </article>
  );
}

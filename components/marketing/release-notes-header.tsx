"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ReleaseNotesHeaderProps {
  appVersion: string;
  date: string;
  issueNumber: string;
  location: string;
  publicationName?: string;
  subtitle?: string;
  title: string;
}

function TerminalLine({
  prefix,
  text,
  delay = 0,
  className,
  textClassName,
}: {
  prefix: string;
  text: string;
  delay?: number;
  className?: string;
  textClassName?: string;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex += 1;
        } else {
          clearInterval(typeInterval);
          setIsComplete(true);
          setTimeout(() => setShowCursor(false), 500);
        }
      }, 25);

      return () => clearInterval(typeInterval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, delay]);

  return (
    <div className={cn("font-mono", className)}>
      <span className="text-primary">{prefix}</span>
      <span className={cn("text-foreground", textClassName)}>
        {displayedText}
      </span>
      {!!showCursor && (
        <span
          className={cn(
            "ml-0.5 inline-block w-2 bg-primary align-middle",
            isComplete ? "animate-pulse" : "",
            textClassName?.includes("text-3xl") ? "h-8" : "h-4"
          )}
        />
      )}
    </div>
  );
}

function TerminalWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-background/80 shadow-lg backdrop-blur-sm">
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 border-border/50 border-b bg-muted/30 px-4 py-2">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-red-500/80" />
          <div className="size-3 rounded-full bg-yellow-500/80" />
          <div className="size-3 rounded-full bg-green-500/80" />
        </div>
        <span className="ml-2 font-mono text-muted-foreground text-xs">
          suplex@release ~ %
        </span>
      </div>
      {/* Terminal content */}
      <div className="space-y-3 p-6">{children}</div>
    </div>
  );
}

export default function ReleaseNotesHeader({
  date,
  location,
  issueNumber,
  appVersion,
  title,
  subtitle,
  publicationName = "What's New",
}: ReleaseNotesHeaderProps) {
  return (
    <header className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/10 to-background" />

      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-12 md:pt-36 md:pb-16">
        <TerminalWindow>
          {/* Command */}
          <TerminalLine
            className="text-muted-foreground text-sm"
            delay={200}
            prefix="$ "
            text="cat release.info"
            textClassName="text-muted-foreground"
          />

          {/* Metadata row */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 pl-4 font-mono text-muted-foreground text-xs">
            <TerminalLine
              className="text-xs"
              delay={500}
              prefix="⎿   "
              text={`#${issueNumber}`}
              textClassName="text-muted-foreground"
            />
            <TerminalLine
              className="text-xs"
              delay={600}
              prefix=""
              text={appVersion}
              textClassName="text-muted-foreground"
            />
            <TerminalLine
              className="text-xs"
              delay={700}
              prefix=""
              text={date}
              textClassName="text-muted-foreground"
            />
            <TerminalLine
              className="text-xs"
              delay={800}
              prefix=""
              text={location}
              textClassName="text-muted-foreground"
            />
          </div>

          {/* Divider */}
          <div className="my-4 border-border/30 border-t" />

          {/* Publication name */}
          <div className="pl-4 font-mono text-muted-foreground text-xs uppercase tracking-widest">
            {publicationName}
          </div>

          {/* Title */}
          <TerminalLine
            className="font-bold text-3xl tracking-tight md:text-4xl lg:text-5xl"
            delay={1000}
            prefix="> "
            text={title}
            textClassName="text-foreground"
          />

          {/* Subtitle */}
          {!!subtitle && (
            <TerminalLine
              className="pl-4 text-lg md:text-xl"
              delay={1400}
              prefix="  "
              text={subtitle}
              textClassName="text-muted-foreground"
            />
          )}
        </TerminalWindow>
      </div>
    </header>
  );
}

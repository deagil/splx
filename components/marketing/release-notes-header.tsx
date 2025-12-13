'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type ReleaseNotesHeaderProps = {
  date: string
  location: string
  issueNumber: string
  appVersion: string
  title: string
  subtitle?: string
  publicationName?: string
}

function TerminalLine({
  prefix,
  text,
  delay = 0,
  className,
  textClassName,
}: {
  prefix: string
  text: string
  delay?: number
  className?: string
  textClassName?: string
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      let currentIndex = 0
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(typeInterval)
          setIsComplete(true)
          setTimeout(() => setShowCursor(false), 500)
        }
      }, 25)

      return () => clearInterval(typeInterval)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [text, delay])

  return (
    <div className={cn('font-mono', className)}>
      <span className="text-primary">{prefix}</span>
      <span className={cn('text-foreground', textClassName)}>{displayedText}</span>
      {showCursor && (
        <span
          className={cn(
            'inline-block w-2 bg-primary ml-0.5 align-middle',
            isComplete ? 'animate-pulse' : '',
            textClassName?.includes('text-3xl') ? 'h-8' : 'h-4',
          )}
        />
      )}
    </div>
  )
}

function TerminalWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg overflow-hidden">
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-red-500/80" />
          <div className="size-3 rounded-full bg-yellow-500/80" />
          <div className="size-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-muted-foreground font-mono ml-2">
          suplex@release ~ %
        </span>
      </div>
      {/* Terminal content */}
      <div className="p-6 space-y-3">{children}</div>
    </div>
  )
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
            prefix="$ "
            text="cat release.info"
            delay={200}
            className="text-sm text-muted-foreground"
            textClassName="text-muted-foreground"
          />

          {/* Metadata row */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground font-mono pl-4">
            <TerminalLine
              prefix="⎿   "
              text={`#${issueNumber}`}
              delay={500}
              className="text-xs"
              textClassName="text-muted-foreground"
            />
            <TerminalLine
              prefix=""
              text={appVersion}
              delay={600}
              className="text-xs"
              textClassName="text-muted-foreground"
            />
            <TerminalLine
              prefix=""
              text={date}
              delay={700}
              className="text-xs"
              textClassName="text-muted-foreground"
            />
            <TerminalLine
              prefix=""
              text={location}
              delay={800}
              className="text-xs"
              textClassName="text-muted-foreground"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-border/30 my-4" />

          {/* Publication name */}
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest pl-4">
            {publicationName}
          </div>

          {/* Title */}
          <TerminalLine
            prefix="> "
            text={title}
            delay={1000}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
            textClassName="text-foreground"
          />

          {/* Subtitle */}
          {subtitle && (
            <TerminalLine
              prefix="  "
              text={subtitle}
              delay={1400}
              className="text-lg md:text-xl pl-4"
              textClassName="text-muted-foreground"
            />
          )}
        </TerminalWindow>
      </div>
    </header>
  )
}

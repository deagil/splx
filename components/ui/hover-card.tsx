"use client"

import * as React from "react"
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"

import { cn } from "@/lib/utils"

// Base UI renamed HoverCard to PreviewCard. The public wrapper names stay
// HoverCard* so no call site changes.
function HoverCard({
  openDelay,
  closeDelay,
  ...props
}: React.ComponentProps<typeof PreviewCardPrimitive.Root> & {
  openDelay?: number
  closeDelay?: number
}) {
  // Radix's openDelay/closeDelay lived on Root; in Base UI they live on Trigger.
  // Stash them in context so HoverCardTrigger can pick them up, keeping the
  // Radix call-site shape working.
  const value = React.useMemo(
    () => ({ openDelay, closeDelay }),
    [openDelay, closeDelay]
  )

  return (
    <HoverCardDelayContext.Provider value={value}>
      <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
    </HoverCardDelayContext.Provider>
  )
}

const HoverCardDelayContext = React.createContext<{
  openDelay?: number
  closeDelay?: number
}>({})

function HoverCardTrigger({
  asChild,
  children,
  delay,
  closeDelay,
  ...props
}: React.ComponentProps<typeof PreviewCardPrimitive.Trigger> & {
  asChild?: boolean
}) {
  const fromRoot = React.useContext(HoverCardDelayContext)
  const renderChild =
    asChild && React.isValidElement(children) ? children : undefined

  return (
    <PreviewCardPrimitive.Trigger
      data-slot="hover-card-trigger"
      delay={delay ?? fromRoot.openDelay}
      closeDelay={closeDelay ?? fromRoot.closeDelay}
      render={renderChild}
      {...props}
    >
      {asChild ? undefined : children}
    </PreviewCardPrimitive.Trigger>
  )
}

// Content becomes Portal > Positioner > Popup; positioning props forward to the
// Positioner explicitly.
function HoverCardContent({
  className,
  align = "center",
  alignOffset,
  side,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PreviewCardPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof PreviewCardPrimitive.Positioner>,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        className="isolate z-50"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(
            "bg-popover text-popover-foreground w-64 origin-[var(--transform-origin)] rounded-md border p-4 shadow-md outline-hidden",
            "transition-[opacity,transform,scale] duration-150 ease-out",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0",
            className
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }

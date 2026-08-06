"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

// Radix's `delayDuration` is `delay` in Base UI. Both names are accepted here so
// the 11 existing `delayDuration` call sites keep working. The 0 default
// preserves splx's instant tooltips — Base UI's own default is 600ms.
function TooltipProvider({
  delay,
  delayDuration,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider> & {
  delayDuration?: number
}) {
  return (
    <TooltipPrimitive.Provider delay={delay ?? delayDuration ?? 0} {...props} />
  )
}

// Radix took `delayDuration` on Root; in Base UI the delay lives on Provider and
// Trigger. Since this wrapper already renders its own Provider, the value is
// simply forwarded there rather than threaded down to the Trigger via context.
function Tooltip({
  delayDuration,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root> & {
  delayDuration?: number
}) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
  asChild?: boolean
}) {
  const renderChild =
    asChild && React.isValidElement(children) ? children : undefined

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      render={renderChild}
      {...props}
    >
      {asChild ? undefined : children}
    </TooltipPrimitive.Trigger>
  )
}

// Content becomes Portal > Positioner > Popup. Positioning props must be
// destructured and forwarded to the Positioner — left in `...props` they land on
// the Popup and silently stop working.
function TooltipContent({
  className,
  align,
  alignOffset,
  side,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof TooltipPrimitive.Positioner>,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        className="isolate z-50"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "bg-foreground text-background w-fit origin-[var(--transform-origin)] rounded-md px-3 py-1.5 text-xs text-balance",
            "transition-[opacity,transform,scale] duration-150 ease-out",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0",
            className
          )}
          {...props}
        >
          {children}
          {/* Base UI's Arrow renders a <div>, and unlike Radix it is not
              auto-rotated per side — it needs explicit per-side offsets. */}
          <TooltipPrimitive.Arrow
            className={cn(
              "bg-foreground z-50 size-2.5 rotate-45 rounded-[2px]",
              "data-[side=bottom]:top-1 data-[side=top]:-bottom-1",
              "data-[side=left]:right-[-3px] data-[side=left]:top-1/2! data-[side=left]:-translate-y-1/2",
              "data-[side=right]:left-[-3px] data-[side=right]:top-1/2! data-[side=right]:-translate-y-1/2"
            )}
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

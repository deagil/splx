"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

// Base UI restructures Progress: Root > Track > Indicator, where the Indicator
// sizes itself (it sets `width: N%` and `insetInlineStart: 0` inline), so
// Radix's manual `translateX(-(100 - value)%)` transform is gone.
//
// The visual track background stays on Root rather than moving to Track, because
// both call sites style it through Root's className (`h-2 bg-muted`). Track is a
// transparent full-size layer that only provides the positioning context.
function Progress({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, "value"> & {
  value?: number | null
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      value={value ?? null}
      {...props}
    >
      <ProgressPrimitive.Track className="relative block h-full w-full overflow-hidden rounded-[inherit]">
        <ProgressPrimitive.Indicator className="absolute h-full bg-primary transition-all" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }

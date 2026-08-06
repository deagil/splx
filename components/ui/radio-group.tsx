"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

// Base UI splits Radix's radio-group across two subpaths: the group root is a
// single callable primitive from `@base-ui/react/radio-group`, and each item is
// `Radio.Root` + `Radio.Indicator` from `@base-ui/react/radio`.
// Base UI widens the group's value to `unknown`; Radix typed it as `string` and
// every call site here passes strings, so the wrapper narrows it back rather
// than pushing casts out to consumers.
function RadioGroup({
  className,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<typeof RadioGroupPrimitive>,
  "value" | "defaultValue" | "onValueChange"
> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      onValueChange={
        onValueChange ? (next) => onValueChange(String(next)) : undefined
      }
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }

"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Base UI drops Radix's `type` / `collapsible` props: single mode is the
// default and is always collapsible, and `multiple` is a boolean. Values are
// always arrays, even in single mode. This wrapper keeps Radix's call-site
// signature and adapts, so consumers are unchanged.
function Accordion({
  type,
  collapsible: _collapsible,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<typeof AccordionPrimitive.Root>,
  "value" | "defaultValue" | "onValueChange"
> & {
  type?: "single" | "multiple"
  collapsible?: boolean
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
}) {
  const multiple = type === "multiple"
  const toArray = (v: string | string[] | undefined) =>
    v === undefined ? undefined : Array.isArray(v) ? v : [v]

  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      multiple={multiple}
      value={toArray(value)}
      defaultValue={toArray(defaultValue)}
      onValueChange={
        onValueChange
          ? (next) =>
              onValueChange(
                multiple
                  ? (next as string[])
                  : ((next as string[])[0] ?? "")
              )
          : undefined
      }
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

// Trigger's open marker is `data-panel-open`, not `data-open`.
function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 focus-visible:ring-[3px] [&[data-panel-open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

// Radix's Content is Base UI's Panel. The open/close animation moves from
// keyframes (animate-accordion-up/down, which were never actually defined in
// this project) to a height transition driven by --accordion-panel-height.
function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-[--accordion-panel-height] overflow-hidden text-sm transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

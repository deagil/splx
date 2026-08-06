"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

// Root also accepts `asChild`: nav-main.tsx renders the collapsible *as* a
// SidebarMenuItem (<li>) rather than wrapping one in a div.
function Collapsible({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root> & {
  asChild?: boolean
}) {
  const renderChild =
    asChild && React.isValidElement(children) ? children : undefined

  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      render={renderChild}
      {...props}
    >
      {asChild ? undefined : children}
    </CollapsiblePrimitive.Root>
  )
}

// `asChild` is retained as this wrapper's public API and translated to Base UI's
// `render`, so the four existing call sites keep working. `nativeButton` is
// forwarded: leave it true when `render` produces a real <button>, pass false
// when it produces a div so Base UI supplies role/keyboard semantics.
function CollapsibleTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger> & {
  asChild?: boolean
}) {
  const renderChild =
    asChild && React.isValidElement(children) ? children : undefined

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      render={renderChild}
      {...props}
    >
      {asChild ? undefined : children}
    </CollapsiblePrimitive.Trigger>
  )
}

// Radix's Content is Base UI's Panel.
function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Panel>) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

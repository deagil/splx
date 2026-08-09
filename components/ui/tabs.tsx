"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Base UI tabs behind the familiar shadcn names.
 *
 * Replaces a hand-rolled context shim that had no ARIA roles, no arrow-key
 * navigation, and unmounted inactive panels. `keepMounted` is the reason for the
 * swap: editors with per-tab form state need their panels to survive a tab
 * switch.
 *
 * Base UI puts positioning-ish props on different parts than Radix did, so
 * `onValueChange` here receives Base UI's `(value, eventDetails)` signature —
 * the wrapper narrows it back to `(value: string)` for callers.
 */

function Tabs({
  className,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof TabsPrimitive.Root>, "onValueChange"> & {
  onValueChange?: (value: string) => void;
}) {
  return (
    <TabsPrimitive.Root
      className={cn("w-full", className)}
      data-slot="tabs"
      onValueChange={(value) => onValueChange?.(String(value))}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 font-medium text-muted-foreground text-sm ring-offset-background transition-all",
        "hover:bg-background/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm",
        className
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      data-slot="tabs-content"
      {...props}
    />
  );
}

function TabsIndicator({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Indicator>) {
  return (
    <TabsPrimitive.Indicator
      className={cn("absolute", className)}
      data-slot="tabs-indicator"
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };

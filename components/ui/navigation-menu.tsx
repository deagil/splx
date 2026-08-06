import * as React from "react"
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Base UI removes Radix's `viewport` boolean — the viewport always lives in
// Portal > Positioner > Popup > Viewport. The prop is still accepted so call
// sites do not break, but it no longer switches layout modes.
function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn("group/navigation-menu relative z-50 flex max-w-max flex-1 items-center justify-center", className)}
      {...props}
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[popup-open]:hover:bg-accent data-[popup-open]:text-accent-foreground data-[popup-open]:focus:bg-accent data-[popup-open]:bg-accent/50 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1"
)

// The chevron becomes Base UI's Icon part, which the primitive rotates itself
// via data-popup-open on the trigger.
function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <NavigationMenuPrimitive.Icon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[popup-open]:rotate-180"
        aria-hidden="true"
        render={<ChevronDownIcon />}
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "w-full p-2 pr-2.5 md:w-auto",
        // Base UI exposes the transition direction as data-activation-direction
        // rather than Radix's data-motion.
        "transition-[opacity,transform] duration-200 ease-out",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        "data-[activation-direction=left]:data-starting-style:-translate-x-1/2",
        "data-[activation-direction=right]:data-starting-style:translate-x-1/2",
        "data-[activation-direction=left]:data-ending-style:translate-x-1/2",
        "data-[activation-direction=right]:data-ending-style:-translate-x-1/2",
        "**:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
        className
      )}
      {...props}
    />
  )
}

// Radix mounted the Viewport directly inside Root. Base UI moves it into
// Portal > Positioner > Popup > Viewport, and the sizing vars change from
// --radix-navigation-menu-viewport-* to --popup-width / --popup-height.
function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        className="isolate z-50 box-border h-[var(--positioner-height)] w-[var(--positioner-width)] transition-[top,left,right,bottom,width,height] duration-200 ease-out"
        sideOffset={6}
      >
        <NavigationMenuPrimitive.Popup
          className={cn(
            "origin-[var(--transform-origin)] bg-popover text-popover-foreground relative h-full w-full overflow-hidden rounded-md border shadow",
            "transition-[opacity,transform,scale] duration-200 ease-out",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0"
          )}
        >
          <NavigationMenuPrimitive.Viewport
            data-slot="navigation-menu-viewport"
            className={cn("relative h-full w-full overflow-hidden", className)}
            {...props}
          />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  )
}

// All five call sites wrap a Next.js <Link> via asChild, so the shim is
// load-bearing here.
function NavigationMenuLink({
  className,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link> & {
  asChild?: boolean
}) {
  const renderChild =
    asChild && React.isValidElement(children) ? children : undefined

  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      render={renderChild}
      className={cn(
        "data-[active=true]:focus:bg-accent data-[active=true]:hover:bg-accent data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {asChild ? undefined : children}
    </NavigationMenuPrimitive.Link>
  )
}

// Base UI has no NavigationMenu Indicator equivalent. Kept as an inert
// passthrough per the skill's hard rule so the export does not disappear; it
// renders the same arrow markup but is no longer driven by the primitive, so
// it will not track or animate between triggers. No consumer uses it.
function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
    </div>
  )
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
}

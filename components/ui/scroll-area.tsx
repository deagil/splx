'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

function ScrollArea({
  className,
  viewportClassName,
  children,
  viewportRef,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  viewportRef?: React.Ref<HTMLDivElement>;
  viewportClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn('relative overflow-hidden', className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn('h-full w-full rounded-[inherit]', viewportClassName)}
      >
        {/* Base UI adds a Content part between Viewport and children; it applies
            `min-width: fit-content`, which is what lets content overflow
            horizontally and drive the horizontal scrollbar. */}
        <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

// Radix's `ScrollAreaScrollbar` / `ScrollAreaThumb` are `Scrollbar` / `Thumb` in
// Base UI. Radix's `type` prop ("auto" | "always" | "scroll" | "hover") is gone;
// Base UI instead exposes `keepMounted`, which defaults to false (the scrollbar
// is absent from the DOM while the viewport is not scrollable).
function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none select-none transition-colors',
        orientation === 'vertical' && 'h-full w-2 border-l border-l-transparent p-[1px]',
        orientation === 'horizontal' && 'h-2 flex-col border-t border-t-transparent p-[1px]',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger> & { asChild?: boolean }) {
  const renderChild = asChild && React.isValidElement(children) ? children : undefined;

  return (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" render={renderChild} {...props}>
      {asChild ? undefined : children}
    </PopoverPrimitive.Trigger>
  );
}

// Radix's Content becomes Portal > Positioner > Popup. Positioning props live on
// the Positioner, so they must be destructured here and forwarded explicitly —
// left in `...props` they would land on the Popup and silently do nothing.
function PopoverContent({
  className,
  align = 'center',
  alignOffset,
  side,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof PopoverPrimitive.Positioner>,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="isolate z-50"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            'w-72 origin-[var(--transform-origin)] rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md shadow-black/5 outline-hidden',
            // Base UI drives enter/exit with CSS transitions and the
            // data-starting-style / data-ending-style hooks, rather than Radix's
            // data-[state] keyframe classes.
            'transition-[opacity,transform,scale] duration-150 ease-out',
            'data-starting-style:scale-95 data-starting-style:opacity-0',
            'data-ending-style:scale-95 data-ending-style:opacity-0',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };

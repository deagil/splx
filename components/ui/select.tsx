'use client';

import * as React from 'react';
import { isValidElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from '@base-ui/react/select';

// Create a Context for `indicatorPosition` and `indicator` control
const SelectContext = React.createContext<{
  indicatorPosition: 'left' | 'right';
  indicatorVisibility: boolean;
  indicator: ReactNode;
}>({ indicatorPosition: 'left', indicator: null, indicatorVisibility: true });

// Root Component. Base UI's Select.Root is generic over <Value, Multiple>, so
// the wrapper is generic too rather than using React.ComponentProps.
//
// Base UI reports "no selection" as `null`; Radix reported it as `""`. Every
// call site here is typed against the Radix shape, so the wrapper narrows
// `onValueChange` back to a non-null value and coerces `null` to `""` — which is
// exactly the value Radix would have emitted.
const Select = <Value, Multiple extends boolean | undefined = false>({
  indicatorPosition = 'left',
  indicatorVisibility = true,
  indicator,
  onValueChange,
  ...props
}: {
  indicatorPosition?: 'left' | 'right';
  indicatorVisibility?: boolean;
  indicator?: ReactNode;
  onValueChange?: (
    value: NonNullable<SelectPrimitive.Root.Props<Value, Multiple>['value']>,
    eventDetails: Parameters<
      NonNullable<SelectPrimitive.Root.Props<Value, Multiple>['onValueChange']>
    >[1],
  ) => void;
} & Omit<SelectPrimitive.Root.Props<Value, Multiple>, 'onValueChange'>) => {
  return (
    <SelectContext.Provider value={{ indicatorPosition, indicatorVisibility, indicator }}>
      <SelectPrimitive.Root
        onValueChange={
          onValueChange
            ? (value, eventDetails) =>
                onValueChange(
                  (value ?? '') as NonNullable<
                    SelectPrimitive.Root.Props<Value, Multiple>['value']
                  >,
                  eventDetails,
                )
            : undefined
        }
        {...props}
      />
    </SelectContext.Provider>
  );
};

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

// Define size variants for SelectTrigger
const selectTriggerVariants = cva(
  `
    flex bg-background w-full items-center justify-between outline-none border border-input shadow-xs shadow-black/5 transition-shadow
    text-foreground data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px]
    focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1
    aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/20
    [[data-invalid=true]_&]:border-destructive/60 [[data-invalid=true]_&]:ring-destructive/10  dark:[[data-invalid=true]_&]:border-destructive dark:[[data-invalid=true]_&]:ring-destructive/20
  `,
  {
    variants: {
      size: {
        xs: 'h-7 px-2 text-xs gap-1 rounded-md',
        sm: 'h-8 px-2.5 text-xs gap-1 rounded-md',
        md: 'h-9 px-3 text-sm gap-1 rounded-md',
        lg: 'h-10 px-4 text-sm gap-1.5 rounded-md',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface SelectTriggerProps
  extends React.ComponentProps<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {}

function SelectTrigger({ className, children, size, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(selectTriggerVariants({ size }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronDown className="h-4 w-4 opacity-60 -me-0.5" />} />
    </SelectPrimitive.Trigger>
  );
}

// Radix's ScrollUp/DownButton are ScrollUp/DownArrow in Base UI.
function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn('top-0 flex w-full cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn('bottom-0 flex w-full cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

// Content becomes Portal > Positioner > Popup, with Viewport becoming List.
// Radix's `position` prop is gone: "popper" is `alignItemWithTrigger={false}`,
// and "item-aligned" is `true`. This wrapper defaulted to "popper", so the
// default here is `false` to preserve behaviour.
function SelectContent({
  className,
  children,
  alignItemWithTrigger = false,
  align,
  alignOffset,
  side,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof SelectPrimitive.Positioner>,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="isolate z-50"
        alignItemWithTrigger={alignItemWithTrigger}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            'relative max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover shadow-md shadow-black/5 text-secondary-foreground origin-[var(--transform-origin)]',
            'transition-[opacity,transform,scale] duration-150 ease-out',
            'data-starting-style:scale-95 data-starting-style:opacity-0',
            'data-ending-style:scale-95 data-ending-style:opacity-0',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="w-full min-w-[var(--anchor-width)] p-1.5">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

// Radix's group Label is Base UI's GroupLabel (Base UI's `Label` is the form
// label for the whole select, a different part).
function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn('py-1.5 ps-8 pe-2 text-xs text-muted-foreground font-medium', className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const { indicatorPosition, indicatorVisibility, indicator } = React.useContext(SelectContext);

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 text-sm outline-hidden text-foreground hover:bg-accent data-highlighted:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50',
        indicatorPosition === 'left' ? 'ps-8 pe-2' : 'pe-8 ps-2',
        className,
      )}
      {...props}
    >
      {indicatorVisibility &&
        (indicator && isValidElement(indicator) ? (
          indicator
        ) : (
          <span
            className={cn(
              'absolute flex h-3.5 w-3.5 items-center justify-center',
              indicatorPosition === 'left' ? 'start-2' : 'end-2',
            )}
          >
            <SelectPrimitive.ItemIndicator>
              <Check className="h-4 w-4 text-primary" />
            </SelectPrimitive.ItemIndicator>
          </span>
        ))}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectIndicator({
  children,
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const { indicatorPosition } = React.useContext(SelectContext);

  return (
    <span
      data-slot="select-indicator"
      className={cn(
        'absolute flex top-1/2 -translate-y-1/2 items-center justify-center',
        indicatorPosition === 'left' ? 'start-2' : 'end-2',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator>{children}</SelectPrimitive.ItemIndicator>
    </span>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('-mx-1.5 my-1.5 h-px bg-border', className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

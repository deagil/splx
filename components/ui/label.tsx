'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const labelVariants = cva(
  'text-sm leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'font-medium',
        secondary: 'font-normal',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

// Base UI has no Label primitive: inside a Field it is Field.Label, and
// standalone it is a native <label>. Radix's Label added only click-forwarding
// to the associated control, which the browser already does via htmlFor.
function Label({
  className,
  variant,
  ...props
}: React.ComponentProps<'label'> & VariantProps<typeof labelVariants>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: generic wrapper; consumers supply htmlFor or nest the control
    <label data-slot="label" className={cn(labelVariants({ variant }), className)} {...props} />
  );
}

export { Label };

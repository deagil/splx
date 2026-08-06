'use client';

import * as React from 'react';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from '@/lib/utils';

// Base UI's Separator is a single callable primitive (no .Root) and drops
// `decorative`; it is always presentational. The prop is still accepted here so
// existing call sites keep working, but it is not forwarded.
function Separator({
  className,
  orientation = 'horizontal',
  decorative: _decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive> & { decorative?: boolean }) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  );
}

export { Separator };

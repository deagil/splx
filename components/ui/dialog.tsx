'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

// Centered modals use Popup directly with no Positioner. Enter/exit move from
// Radix's data-[state] keyframe classes to Base UI's transition hooks.
const dialogContentVariants = cva(
  'flex flex-col fixed outline-0 z-50 border border-border bg-background p-6 shadow-lg shadow-black/5 sm:rounded-lg transition-[opacity,transform,scale] duration-200 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
  {
    variants: {
      variant: {
        default: 'left-[50%] top-[50%] max-w-lg translate-x-[-50%] translate-y-[-50%] w-full',
        fullscreen: 'inset-5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger> & { asChild?: boolean }) {
  const renderChild = asChild && React.isValidElement(children) ? children : undefined;

  return (
    <DialogPrimitive.Trigger data-slot="dialog-trigger" render={renderChild} {...props}>
      {asChild ? undefined : children}
    </DialogPrimitive.Trigger>
  );
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal {...props} />;
}

function DialogClose({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close> & { asChild?: boolean }) {
  const renderChild = asChild && React.isValidElement(children) ? children : undefined;

  return (
    <DialogPrimitive.Close data-slot="dialog-close" render={renderChild} {...props}>
      {asChild ? undefined : children}
    </DialogPrimitive.Close>
  );
}

// Radix's Overlay is Base UI's Backdrop. The export name is kept so consumers
// importing DialogOverlay are unaffected.
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/30 [backdrop-filter:blur(4px)] transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlay = true,
  variant,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean;
    overlay?: boolean;
  }) {
  return (
    <DialogPortal>
      {overlay && <DialogOverlay />}
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ variant }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose className="cursor-pointer outline-0 absolute end-5 top-5 rounded-sm opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

export default DialogContent;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-header"
    className={cn('flex flex-col space-y-1 text-center sm:text-start mb-5', className)}
    {...props}
  />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-footer"
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end pt-5 sm:space-x-2.5', className)}
    {...props}
  />
);

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="dialog-body" className={cn('grow', className)} {...props} />
);

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

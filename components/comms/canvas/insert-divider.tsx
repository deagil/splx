"use client";

/**
 * The "＋" affordance between two blocks.
 *
 * Layout-neutral by construction (`h-0`, hit area and rule both absolutely
 * positioned). Giving this any height would add a gap to every seam on the
 * canvas that the delivered email does not have.
 */

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EmailBlockType } from "@/lib/comms/types";
import { EMAIL_BLOCK_TYPES } from "@/lib/comms/types";
import { cn } from "@/lib/utils";
import { BLOCK_META } from "./block-meta";

export function InsertDivider({
  index,
  onInsert,
}: {
  index: number;
  onInsert: (type: EmailBlockType, index: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn("group/insert relative h-0", open && "z-20")}
      data-open={open || undefined}
    >
      {/* Hit area straddling the seam, so the affordance is reachable without
          the user having to hit a zero-height target. */}
      <div className="absolute inset-x-0 -top-3 h-6" />

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px origin-center scale-x-0 bg-primary/50 transition-transform duration-150",
          "group-hover/insert:scale-x-100",
          open && "scale-x-100"
        )}
      />

      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          aria-label="Insert block here"
          className={cn(
            "absolute top-0 left-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity duration-150",
            "hover:border-primary/50 hover:text-primary focus-visible:opacity-100 group-hover/insert:opacity-100",
            open && "opacity-100"
          )}
        >
          <PlusIcon className="size-3" />
        </PopoverTrigger>
        <PopoverContent align="center" className="w-56 p-1" side="bottom">
          <p className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
            Insert block
          </p>
          {EMAIL_BLOCK_TYPES.map((type) => {
            const meta = BLOCK_META[type];
            const Icon = meta.icon;
            return (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                key={type}
                onClick={() => {
                  onInsert(type, index);
                  setOpen(false);
                }}
                type="button"
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{meta.label}</span>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

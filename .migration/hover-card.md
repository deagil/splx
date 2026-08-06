# hover-card

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; primitive renamed, public API unchanged.

## Changed

- `components/ui/hover-card.tsx:4` — `from "@radix-ui/react-hover-card"` →
  `from "@base-ui/react/preview-card"`. **Base UI renamed the primitive to PreviewCard.**
  The wrapper's public exports stay `HoverCard` / `HoverCardTrigger` /
  `HoverCardContent`, so none of the 6 consumers change.
- **Content → Portal > Positioner > Popup**, with `align` / `alignOffset` / `side` /
  `sideOffset` destructured and forwarded to the Positioner ("Pick means FORWARD").
- **`openDelay` / `closeDelay` re-plumbed.** Radix took them on Root; Base UI moved them
  to Trigger. The wrapper keeps accepting them on `HoverCard` and passes them down
  through a small local context that `HoverCardTrigger` reads, so the Radix call-site
  shape still works. An explicit `delay` / `closeDelay` on the trigger wins over the
  Root-level value.
- `HoverCardTrigger` gained the `asChild` → `render` shim.
- Animation moved to `data-starting-style:` / `data-ending-style:` transitions;
  `origin-(--radix-hover-card-content-transform-origin)` →
  `origin-[var(--transform-origin)]`.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/hover-card.tsx` → no matches.

## Left alone

- All 6 consumers. No call site changed.

## Behavior changes

- **Open delay default changes 700ms → 600ms** where no explicit `openDelay` is passed
  (Base UI Trigger default). `closeDelay` stays 300ms.
- Base UI's PreviewCard Trigger renders an `<a>`, same as Radix's HoverCard Trigger, so
  there is no `nativeButton` concern here.
- `collisionPadding` / `arrowPadding` defaults change 0 → 5.
- `onOpenChange` gains a second `eventDetails` argument.

## Verify by hand

1. Find a hover-card trigger (link preview) and hover it → the card should appear after
   roughly half a second, centred under the link.
2. Move the pointer off → it should fade out after ~300ms, not instantly.
3. Move the pointer *into* the card → it should stay open.
4. Check a trigger near the bottom of the viewport → the card should flip above rather
   than clip.

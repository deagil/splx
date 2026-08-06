# popover

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; `PopoverAnchor` removed.

## Changed

- `components/ui/popover.tsx:5` — `from 'radix-ui'` → `from '@base-ui/react/popover'`.
- **Content → Portal > Positioner > Popup.** Radix put positioning props on Content;
  Base UI puts them on the Positioner. Per the skill's "Pick means FORWARD" rule, each
  of `align` / `alignOffset` / `side` / `sideOffset` is declared, destructured, and
  forwarded explicitly. Left in `...props` they would land on the Popup and positioning
  would silently break with no type error.
- Positioner carries `isolate z-50` (the conventional placement); the z-index moved off
  the Popup.
- `PopoverTrigger` gained the `asChild` → `render` shim; both call sites in
  `page-screen.tsx` use `asChild`.
- Animation rewritten from Radix's `data-[state=…]` keyframe classes
  (`animate-in`/`animate-out`, `fade-*`, `zoom-*`, `slide-in-from-*`) to Base UI's
  transition model: `transition-[opacity,transform,scale]` plus
  `data-starting-style:` / `data-ending-style:`.
- CSS var: `origin-(--radix-popover-content-transform-origin)` →
  `origin-[var(--transform-origin)]`.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/popover.tsx` → no matches.

## Left alone

- `components/pages/page-screen.tsx` is the only consumer and needed no edit — it passes
  `align="end"` and `className`, both still supported.

## Behavior changes

- **`PopoverAnchor` was removed, not stubbed.** Base UI has no Anchor part; the
  equivalent is an `anchor` prop on the Positioner. The export had **zero importers**, so
  it is deleted rather than kept as an inert passthrough — a future consumer will get a
  compile error pointing at the right replacement instead of a silently non-functional
  component.
- `collisionPadding` and `arrowPadding` defaults change 0 → 5 in Base UI. Neither is set
  here, so popovers may sit ~5px further from viewport edges.
- `onOpenChange` gains a second `eventDetails` argument, and its reasons now include
  hover/focus variants. `page-screen.tsx` passes a plain `setState`, unaffected.

## Verify by hand

1. Open a page in edit mode (`/app/pages/[pageId]?viewMode=edit`).
2. Click the **Add block** button (top toolbar) → the popover should open below-right,
   aligned to the button's end edge (`align="end"`), 280px wide.
3. Confirm it fades and scales in, and fades out on close rather than snapping.
4. Click **Open templates** → same check.
5. Press Escape and click outside — both should dismiss.
6. Scroll the page with a popover open — it should track the trigger.

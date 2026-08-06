# tooltip

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; 16 consumers, 38 `asChild` trigger sites, all unchanged.

## Changed

- `components/ui/tooltip.tsx:4` — `from "@radix-ui/react-tooltip"` (namespace import) →
  `from "@base-ui/react/tooltip"` (named).
- **Content → Portal > Positioner > Popup**, with `align` / `alignOffset` / `side` /
  `sideOffset` declared, destructured and forwarded to the Positioner per the skill's
  "Pick means FORWARD" rule. This matters here: consumers actively use them —
  `align="start"` / `align="end"` across the sidebar files, and
  `side="left" sideOffset={8}` at `components/chat/messages.tsx:329`. Had they been left
  in `...props` they would have landed on the Popup and silently stopped positioning.
- `sideOffset` default changed 0 → 4, matching the base registry golden.
- `TooltipTrigger` gained the `asChild` → `render` shim. **38 call sites** use `asChild`;
  none changed.
- **`delayDuration` is accepted on both `Tooltip` and `TooltipProvider`** and mapped to
  Base UI's `delay`. Radix took `delayDuration` on Root; Base UI moves delay to
  Provider/Trigger. Since this wrapper already renders its own Provider, the Root-level
  value is forwarded there rather than threaded to the Trigger through context. This
  keeps 11 existing `delayDuration` call sites compiling untouched
  (`chat-sidebar.tsx:230,265,287`, `ui/sidebar.tsx:132`, `chat/messages.tsx:300`,
  the three `pages/blocks/*-view.tsx`, `page-grid-editor.tsx`, `page-screen.tsx`,
  `shared/toolbar.tsx`). The `0` default preserves splx's instant tooltips — Base UI's
  own default is 600ms.
- **Arrow rewritten.** Base UI's Arrow renders a `<div>`, not an auto-rotated `<svg>`,
  and needs explicit per-side positioning classes (shape taken from the skill's
  `wrapper-shapes.md`). Dropped `fill-foreground`, which was SVG-only.
- Animation moved from `data-[state=…]` keyframes to `data-starting-style:` /
  `data-ending-style:` transitions; `origin-(--radix-tooltip-content-transform-origin)` →
  `origin-[var(--transform-origin)]`.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/tooltip.tsx` → no matches.

## Left alone

- All 16 consumer files. The wrapper absorbs every API difference (`asChild`,
  `delayDuration`, positioning props), so no call site changed.

## Behavior changes

- **Arrow positioning is the most likely visual regression.** Radix positioned and
  rotated the arrow itself; Base UI expects the consumer to do it with per-side classes.
  The offsets used here follow the skill's documented shape, but the exact pixel values
  are worth eyeballing on all four sides.
- `collisionPadding` / `arrowPadding` defaults change 0 → 5.
- Radix's tri-state `data-state` (`closed` / `delayed-open` / `instant-open`) becomes
  `data-open`/`data-closed` plus a separate `data-instant`. Nothing here styled on the
  delayed/instant distinction.
- Base UI adds `closeOnClick` (default true) on Trigger — a tooltip now closes when its
  trigger is clicked. Radix kept it open. This is mostly desirable on the many
  icon-button triggers here, but it is a change.

## Verify by hand

1. Sidebar rail: hover each icon button → tooltip appears **instantly** (delay 0), to the
   side, with the arrow pointing at the button.
2. `chat-sidebar` buttons with `delayDuration={1000}` → confirm those still wait ~1s.
3. `components/chat/messages.tsx` message actions → tooltip on the **left**
   (`side="left" sideOffset={8}`); confirm it is offset and not flush.
4. Check arrow rendering on all four sides — top, bottom, left, right — since the arrow
   is the highest-risk change.
5. Click a tooltip trigger → note the tooltip now dismisses on click (new behaviour).
6. Hover between two adjacent tooltips quickly → the second should open instantly
   (Provider `timeout`).

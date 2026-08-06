# scroll-area

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; two behaviour deltas flagged.

## Changed

- `components/ui/scroll-area.tsx:5` — `from 'radix-ui'` →
  `from '@base-ui/react/scroll-area'`.
- `components/ui/scroll-area.tsx:26` — **new `Content` part** inserted between Viewport
  and children. Base UI's Content applies `min-width: fit-content`
  (`@base-ui/react/scroll-area/content/ScrollAreaContent.js:69-70`), which is what lets
  content overflow horizontally and drive the horizontal scrollbar. Radix had no
  equivalent part.
- `components/ui/scroll-area.tsx:41,55` — part renames:
  `ScrollAreaPrimitive.ScrollAreaScrollbar` → `.Scrollbar`,
  `ScrollAreaPrimitive.ScrollAreaThumb` → `.Thumb`. `Root`, `Viewport` and `Corner`
  keep their names.
- Radix's `type` prop (`"auto" | "always" | "scroll" | "hover"`) has no Base UI
  equivalent and is gone. Base UI instead exposes `keepMounted` on Scrollbar. No call
  site passed `type`, so nothing was lost.
- `viewportRef` and `viewportClassName` — splx-local additions to the wrapper API,
  preserved unchanged.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/scroll-area.tsx` → no matches.

## Left alone

- All four call sites needed no edit: `components/elements/suggestion.tsx:15`,
  `components/build/gap-detection-panel.tsx:67`,
  `components/data/table-detail-view.tsx:670`,
  `components/pages/blocks/list-block-view.tsx:270`. None passed `type`, `viewportRef`
  or `viewportClassName`.

## Behavior changes

- **`min-width: fit-content` on the new Content wrapper.** Vertical-only scroll areas
  (`gap-detection-panel.tsx`, `table-detail-view.tsx`) previously had children directly
  in the Viewport with no min-width floor. If any child is intrinsically wider than the
  container, these can now overflow horizontally where before they would have been
  compressed. This is the idiomatic Base UI structure, so it is flagged rather than
  patched.
- **Scrollbar unmounts when not scrollable.** Base UI's `keepMounted` defaults to false,
  so the scrollbar is absent from the DOM while the viewport does not overflow. Radix's
  default `type` behaved similarly on screen, but the DOM node was present. Anything
  querying for the scrollbar element unconditionally would now miss it.
- `components/elements/suggestion.tsx:19` and
  `components/pages/blocks/list-block-view.tsx:272` render `<ScrollBar>` as a *child* of
  `<ScrollArea>`, which places it inside Viewport rather than as a sibling. It resolves
  Root context either way, but Base UI positions scrollbars relative to Root, so check
  the horizontal bar sits where expected in both.

## Verify by hand

1. Open a page with a List block wide enough to overflow → drag the **horizontal**
   scrollbar under the grid; confirm it appears, tracks, and sits at the bottom edge.
2. Open Build → a table with many columns → the column list should scroll vertically
   inside its fixed height with no new horizontal scrollbar appearing.
3. Open the workspace gap-detection panel (600px tall) → scroll vertically, confirm the
   thumb renders and drags.
4. Shrink a scroll area's content until it no longer overflows → the scrollbar should
   disappear entirely rather than render as a disabled track.

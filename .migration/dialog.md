# dialog

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; splx's ReUI-derived extras preserved.

## Changed

- `components/ui/dialog.tsx:7` — `from 'radix-ui'` → `from '@base-ui/react/dialog'`.
- **Overlay → Backdrop**, **Content → Popup**. Centered modals take no Positioner, per
  the skill. Both wrapper export names (`DialogOverlay`, `DialogContent`) are unchanged.
- `asChild` → `render` shims on `DialogTrigger` and `DialogClose`. Two call sites use it
  (`chat/mentions-help-panel.tsx:88`, `chat/chat-help-dialog.tsx:86`).
- Animation rewritten from `data-[state=open]:animate-in` / `data-[state=closed]:animate-out`
  keyframes to `transition-[opacity,transform,scale]` with
  `data-starting-style:` / `data-ending-style:` on both the Popup and the Backdrop.
- Removed `data-[state=open]:bg-accent data-[state=open]:text-muted-foreground` from the
  close button. Those hooks came from Radix's Content `data-state` and never applied to a
  Close in the first place — dead classes, dropped rather than translated.

**splx-local API preserved** (this wrapper is ReUI-derived, not stock shadcn):
`dialogContentVariants` with its `default` / `fullscreen` variants, the
`showCloseButton` and `overlay` props, `DialogBody`, and the
`export default DialogContent` alongside the named exports.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/dialog.tsx` → no matches.

## Left alone

- All 5 consumers. No call site changed.

## Behavior changes

- **Portal renders a wrapper `<div>`.** Radix's Portal rendered nothing extra; Base UI's
  does. Any CSS relying on the popup being a direct child of `document.body` (or on
  `:first-child`-style selectors at that level) would be affected. None found here.
- Radix's `onOpenAutoFocus` / `onCloseAutoFocus` / `onEscapeKeyDown` /
  `onPointerDownOutside` / `onInteractOutside` have no direct equivalents — they become
  Popup `initialFocus` / `finalFocus` and `onOpenChange` reason checks. **No consumer
  used any of them**, so nothing was translated, but new code needs the new shape.
- `onOpenChange` gains a second `eventDetails` argument.

## Verify by hand

1. Chat sidebar → open the **help** dialog (`chat-help-dialog`). It should fade and
   scale in, centred, over a blurred backdrop.
2. Close it with the **X**, with **Escape**, and by clicking the **backdrop** — all three
   must work, and focus should return to the trigger.
3. Open the **mentions help panel** — same checks (this is the second `asChild` trigger).
4. Find a `variant="fullscreen"` dialog if one is reachable and confirm it still insets
   by 5 rather than centring.
5. Confirm the close button is positioned top-right and the backdrop blur still renders.

# alert-dialog

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; one focus-behaviour delta flagged.

## Changed

- `components/ui/alert-dialog.tsx:4` — `from "radix-ui"` →
  `from "@base-ui/react/alert-dialog"`.
- **Overlay → Backdrop**, **Content → Popup** (centred modal, no Positioner).
- **Cancel → Close.** Direct part rename.
- **Action → Close.** Base UI has no Action part. The skill offers three options; the
  behaviour-preserving one is "compose `AlertDialog.Close` and run the action in
  `onClick`" — which is exactly what all four call sites already do (each passes
  `onClick` and expects the dialog to close afterwards). So `AlertDialogAction` maps onto
  `Close` with the default button styling, and `AlertDialogCancel` onto `Close` with the
  outline variant. Consumers are unchanged.
- Dropped `React.forwardRef` + `displayName` throughout for plain function components,
  matching the other migrated wrappers. No call site takes a ref.
- Added the `data-slot` attributes this wrapper was missing on every part.
- Animation rewritten to `data-starting-style:` / `data-ending-style:` transitions. The
  Radix version's `slide-out-to-left-1/2` / `slide-in-from-top-[48%]` utilities are
  dropped — they were compensating for the `translate-x-[-50%] translate-y-[-50%]`
  centring in a keyframe world, and a scale/opacity transition does not need them.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/alert-dialog.tsx` → no matches.

## Left alone

- All four consumers: `components/sidebar/chat-sidebar-content.tsx:521`,
  `components/sidebar/app-sidebar.tsx:151`, `components/sidebar/sidebar-history.tsx:381`,
  `components/chat/chat.tsx:383`. None changed.

## Behavior changes

- **Cancel no longer receives focus on open.** Radix focused the Cancel button by default
  on alert dialogs; Base UI focuses the popup. Recreating it requires threading a ref
  into the Popup's `initialFocus`, which does not fit a generic wrapper cleanly, so per
  the skill's rules this is **flagged, not patched**. It matters most for the destructive
  confirmations here (`Delete All`, `Continue` on chat deletion) — the safe default was
  that Enter hit Cancel.
- Portal renders a wrapper `<div>` (Base UI) where Radix rendered nothing extra.
- `onOpenChange` gains a second `eventDetails` argument.

## Verify by hand

1. Sidebar → chat history → delete a chat. The confirm dialog should fade/scale in over a
   dark backdrop.
2. Click **Continue** → the chat deletes **and** the dialog closes (this is the
   Action → Close mapping working).
3. Reopen and click **Cancel** → closes with no deletion.
4. Reopen and press **Escape** → closes with no deletion.
5. **Check focus on open**: note where focus lands. It will now be the popup rather than
   the Cancel button — confirm pressing Enter immediately does *not* trigger the
   destructive action.
6. Sidebar → **Delete All** → same checks.

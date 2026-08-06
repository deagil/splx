# sheet

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; slide animation rewritten.

## Changed

- `components/ui/sheet.tsx:4` — `from "@radix-ui/react-dialog"` →
  `from "@base-ui/react/dialog"`. Sheet is built on the dialog primitive in both
  libraries, so this migrates after `dialog`.
- **Overlay → Backdrop**, **Content → Popup**.
- `asChild` → `render` shims on `SheetTrigger` and `SheetClose`.
- **The slide is fully rewritten**, which is the substantive change here. Radix used
  tailwindcss-animate keyframes gated on `data-[state]`
  (`slide-in-from-right` / `slide-out-to-right`, plus `data-[state=closed]:duration-300`
  and `data-[state=open]:duration-500`). Base UI drives enter/exit with CSS transitions,
  so each side now uses an explicit transform pair:

  | side | enter/exit transform |
  |---|---|
  | right | `data-starting-style:translate-x-full data-ending-style:translate-x-full` |
  | left | `data-starting-style:-translate-x-full data-ending-style:-translate-x-full` |
  | top | `data-starting-style:-translate-y-full data-ending-style:-translate-y-full` |
  | bottom | `data-starting-style:translate-y-full data-ending-style:translate-y-full` |

  with a single `transition-transform duration-300 ease-in-out`.
- Removed `data-[state=open]:bg-secondary` from the close button — a dead Radix hook that
  never applied to a Close.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/sheet.tsx` → no matches.

## Left alone

- All 3 consumers. No call site changed. Note `components/ui/sidebar.tsx` is one of them
  — it uses Sheet for the mobile sidebar — so the sidebar migration must re-check this.

## Behavior changes

- **Open and close now take the same 300ms.** Radix used asymmetric durations (500ms
  open, 300ms close). The rewrite uses one `duration-300` for both; matching the old
  asymmetry would need separate `data-starting-style` / `data-ending-style` duration
  utilities. Flagged as a deliberate simplification — say the word and it can be split
  back out.
- Portal renders a wrapper `<div>` (Base UI) where Radix rendered nothing extra.
- `onOpenChange` gains a second `eventDetails` argument.

## Verify by hand

1. **Narrow the browser to mobile width** and open the sidebar — this renders through
   Sheet. It should slide in from the left, not fade or jump.
2. Close it (backdrop click, Escape, and the X) — it should slide back out, not vanish.
3. If any other sheet is reachable, check `side="right"` slides from the right.
4. Watch specifically for the sheet appearing *already in position* and only fading —
   that is the failure mode if `data-starting-style` is not applying.

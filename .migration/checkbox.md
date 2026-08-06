# checkbox

2026-08-06 — transformation engine (splx's wrapper is ReUI-derived, so there is no
stock shadcn ancestor to three-way merge against). Migrated; no behaviour change expected.

## Changed

- `components/ui/checkbox.tsx:7` — `import { Checkbox as CheckboxPrimitive } from 'radix-ui'`
  → `from '@base-ui/react/checkbox'`.
- `components/ui/checkbox.tsx:16` — cva data-attribute rewrite. Base UI emits discrete
  boolean attributes instead of Radix's `data-state` enum:
  `data-[state=checked]:` → `data-[checked]:`, `data-[state=indeterminate]:` →
  `data-[indeterminate]:` (6 utilities).
- `components/ui/checkbox.tsx:36-60` — Base UI splits Radix's tri-state `checked`
  (`boolean | "indeterminate"`) into a boolean `checked` plus a separate `indeterminate`
  prop. Rather than break call sites, the wrapper keeps accepting `checked="indeterminate"`
  and splits it internally. It also accepts `indeterminate` directly for new code.
  This matches the project-wide decision to let wrappers absorb Radix→Base UI API
  differences (same rationale as retaining `asChild`).
- `components/ui/checkbox.tsx:55-56` — indicator icon toggles rewritten
  `group-data-[state=indeterminate]:` → `group-data-[indeterminate]:`. Verified Base UI's
  Indicator mounts on `checked || indeterminate`
  (`@base-ui/react/checkbox/indicator/…js:96`), identical to Radix, so the Check/Minus
  swap still works without `keepMounted`.
- `components/build/permissions-matrix.tsx:170` — consumer-side class rewrite,
  `data-[state=checked]:` → `data-[checked]:` on the amber "pending" override.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/checkbox.tsx` → no matches.

## Left alone

- `CheckboxField` in `components/pages/block-forms.tsx:648` and
  `components/pages/builder/page-builder.tsx:1169` — despite the name these render a
  native `<input type="checkbox">`, not this component. Not Radix, not touched.
- The four remaining `<Checkbox>` call sites (`data-grid-table.tsx:391` and `:406`,
  `table-wizard/steps/Step3Fields.tsx:162` and `:177`,
  `table-wizard/steps/Step6Review.tsx:240`, `page-grid-editor.tsx:1087`) needed no edit.
  `data-grid-table.tsx:407` passes the Radix `… && 'indeterminate'` idiom, which the
  wrapper still accepts. `onCheckedChange` consumers receive a boolean either way, so
  `!!value` and `checked === true` are unaffected.

## Behavior changes

None expected. `onCheckedChange` gains a second `eventDetails` argument in Base UI;
no call site reads it.

## Verify by hand

1. Open a page with a List block that has row selection enabled.
2. Tick one row → header checkbox should show the **dash** (indeterminate), not a tick.
3. Tick all rows → header checkbox shows a **tick**.
4. Untick all → header checkbox is empty.
5. In workspace settings → permissions matrix, toggle a permission and confirm the
   unsaved "pending" state still renders amber while checked.

# select

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; 13 consumer type errors resolved inside the wrapper.

## Changed

- `components/ui/select.tsx:8` — `from 'radix-ui'` → `from '@base-ui/react/select'`.
- Part renames: `Viewport` → **`List`**, `ScrollUpButton`/`ScrollDownButton` →
  **`ScrollUpArrow`/`ScrollDownArrow`**, group `Label` → **`GroupLabel`** (Base UI's
  `Label` is a different part — the form label for the whole select).
- **Content → Portal > Positioner > Popup**, positioning props destructured and
  forwarded to the Positioner.
- **`position` → `alignItemWithTrigger`, with the default inverted deliberately.** Radix
  `position="popper"` (this wrapper's default) is Base UI `alignItemWithTrigger={false}`;
  `position="item-aligned"` is `true`. Base UI defaults to `true`, so the wrapper
  explicitly defaults to `false` to preserve the existing popover-style positioning. The
  Radix per-side `translate-*` nudges are replaced by `sideOffset = 4`.
- **`Select` (Root) is now a generic function.** Base UI's `Select.Root` is generic over
  `<Value, Multiple>`, which breaks the usual `React.ComponentProps` pattern. splx's Root
  is not a bare re-export (it is a context provider for the ReUI `indicatorPosition` /
  `indicatorVisibility` / `indicator` API), so the wrapper is made generic rather than
  re-exported.
- **`onValueChange` null-coercion.** Base UI reports "no selection" as `null`; Radix
  reported `""`. All 12 consumers are typed against the Radix shape, so the wrapper
  narrows `onValueChange` to a non-null value and coerces `null` → `""`. This single
  change resolved **13 type errors** across 9 files
  (`table-wizard/steps/Step3Fields.tsx`, `Step4Relationships.tsx`,
  `data/table-detail-view.tsx`, `pages/block-forms.tsx`,
  `pages/builder/page-builder.tsx`, `pages/page-grid-editor.tsx`,
  `settings/integration-forms/postgres-config-form.tsx`,
  `settings/users-roles-section.tsx`).
- `Icon asChild` → `render`. Item highlight `focus:bg-accent` → `data-highlighted:bg-accent`.
- CSS vars: `--radix-select-trigger-width` → `--anchor-width`; content
  `origin-[var(--transform-origin)]`. Scroll arrows gained `top-0 w-full` / `bottom-0 w-full`
  per the skill's select anatomy note.

**splx-local API preserved**: `selectTriggerVariants` with its xs/sm/md/lg sizes,
`SelectIndicator`, and the indicator-position context.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/select.tsx` → no matches.

## Left alone

- All 12 consumers. None changed — the wrapper absorbed the value-type and positioning
  differences.

## Behavior changes

- **Item anatomy deviates from the base registry.** The skill's `wrapper-shapes.md`
  specifies `ItemText` first, then `ItemIndicator`. splx's ReUI anatomy puts an
  absolutely-positioned indicator *before* the text, switchable to either side via
  `indicatorPosition`. That customization is preserved rather than replaced, so this
  wrapper intentionally does not match the registry shape.
- `collisionPadding` / `arrowPadding` defaults change 0 → 5.
- `onValueChange` gains a second `eventDetails` argument (exposed, since the wrapper
  forwards it).

## Verify by hand

1. **Keyboard nav and typeahead** — open any select (Preferences, or a table wizard step),
   then arrow up/down and type the first letters of an option. Both must work.
2. Confirm the **check indicator** renders on the selected item, on the correct side.
3. Open a select near the bottom of the viewport — it should flip above, not clip.
4. Open one with many options (e.g. Data Type in the table wizard) and confirm the
   **scroll arrows** appear at top/bottom and scroll the list.
5. Confirm the trigger shows the **placeholder** in muted text when nothing is selected.
6. Change a value and confirm the change actually persists — this exercises the
   null-coercion path.
7. Check the trigger sizes still differ across `size="xs" | "sm" | "md" | "lg"`.

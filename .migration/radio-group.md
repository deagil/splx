# radio-group

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; split across two subpaths.

## Changed

- `components/ui/radio-group.tsx:4-5` — one Radix import becomes **two** Base UI
  subpaths: the group root from `@base-ui/react/radio-group` (a single **callable**
  primitive, no `.Root`), and the items from `@base-ui/react/radio`
  (`Radio.Root` + `Radio.Indicator`).
- Part mapping: `RadioGroupPrimitive.Root` → callable `RadioGroupPrimitive`,
  `RadioGroupPrimitive.Item` → `RadioPrimitive.Root`,
  `RadioGroupPrimitive.Indicator` → `RadioPrimitive.Indicator`.
- **Value type narrowed back to `string`.** Base UI widens the group's value and
  `onValueChange` to `unknown`; Radix typed them as `string`, and the one consumer passes
  a `Dispatch<SetStateAction<string>>`. Rather than push a cast out to the call site, the
  wrapper narrows `value` / `defaultValue` / `onValueChange` to strings and coerces with
  `String(next)` on the way out. tsc caught this at
  `components/settings/theme-selector.tsx:82`.
- Dropped `React.forwardRef` + `displayName` for plain function components, matching the
  other migrated wrappers. No call site takes a ref.
- Added `data-slot="radio-group"` / `data-slot="radio-group-item"`, which the Radix
  version was missing (every other wrapper in this project sets one).

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/radio-group.tsx` → no matches.

## Left alone

- `components/settings/theme-selector.tsx` is the only consumer and needed no edit once
  the wrapper narrowed the value type.

## Behavior changes

- None expected. `onValueChange` gains a second `eventDetails` argument, absorbed by the
  wrapper's adapter.

## Verify by hand

1. Open **Preferences → Appearance**.
2. Click each of the three modes (light / dark / system) — selection should move, the
   filled circle indicator should render, and the border/background highlight should
   follow.
3. Confirm the theme actually changes (this proves `onValueChange` still delivers a
   string, not `unknown`).
4. Tab to the group and use arrow keys — selection should move between options.

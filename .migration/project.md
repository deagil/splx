# project

2026-08-06 — whole-project Radix → Base UI migration, complete.

**0 wrappers remain on Radix.**

## Strategy

splx's `components.json` was on the legacy `default` style, which per the skill gets
**classification only, no golden replay** — there is no `base-default` variant, and
retargeting onto `base-nova` would have restyled the app. The transformation engine was
run on splx's own files throughout: primitives rewired, splx's exact classes and cva
variants kept.

This was reinforced by the wrappers being **ReUI-derived** (`@reui` is a registry in
`components.json`), not stock shadcn — `selectTriggerVariants`, `SelectIndicator`,
`DialogBody`, `BadgeButton`/`BadgeDot`, `AvatarIndicator`/`AvatarStatus`,
`dialogContentVariants`. `shadcn add --overwrite` would have destroyed all of it, and
there was no meaningful shadcn ancestor to three-way merge against.

**Consequence: the app's look is unchanged by design.** Where visuals do change it is
because Radix and Base UI drive animation differently, not because classes were replayed
from a registry.

## The one project-wide decision

Wrappers **keep `asChild`** as their public API and translate it to Base UI's `render`
internally. There were 103 `asChild` call sites outside `components/ui`; all of them are
untouched. The same principle absorbed every other API break at the wrapper boundary
rather than pushing it into app code:

| Difference | Absorbed how |
|---|---|
| `asChild` → `render` | shim in 12 wrappers |
| checkbox tri-state `checked="indeterminate"` | split into `checked` + `indeterminate` |
| select "no selection" `null` vs `""` | coerced in `onValueChange` (cleared 13 errors) |
| radio-group value widened to `unknown` | narrowed back to `string` |
| accordion `type`/`collapsible`, array values | adapted in the Root wrapper |
| tooltip `delayDuration` → `delay` | accepted on both Provider and Root |
| hover-card `openDelay`/`closeDelay` moved to Trigger | passed down via local context |
| menu `onSelect` → `onClick` | shim in `DropdownMenuItem` |

## Dependency swap

Removed 20 `@radix-ui/*` packages plus the `radix-ui` umbrella. Also removed `cmdk`,
orphaned when its sole importer was deleted. `@base-ui/react@1.7.0` was already present.

`components.json` `style` flipped `default` → `base-nova` **after** the last component,
so future `shadcn add` delivers Base UI variants. Note this is metadata only: the
existing wrappers are ReUI-derived and were never registry-shaped, so the flip does not
retroactively restyle anything.

## Deleted rather than migrated

`breadcrumb.tsx` (109), `command.tsx` (139), `toolbar.tsx` (389) and
`mark-toolbar-button.tsx` (21) had **zero references** — 658 lines removed. This retired
`command.tsx`, the highest-risk item in the original plan (cmdk wrapped in a Radix
Dialog, where the skill's hard rule is never to touch cmdk): the risk disappeared rather
than being managed.

Remaining orphans in `components/ui` — `editor-static.tsx`, `feature_card.tsx`,
`mention-node-static.tsx` — are pre-existing dead code unrelated to Radix and were left
alone.

## App-code sweep

The call-site break surface was much larger than `asChild`, exactly as the skill warns.

**Trigger attributes were the subtle part.** Radix set `data-state="open"` on every open
trigger; Base UI splits it by family — `data-popup-open` for menu/popover/select
triggers, `data-panel-open` for collapsible/accordion triggers. Elements rendered *as* a
trigger via `asChild` therefore had to be **reclassified by owning component**, not
bulk-renamed. `SidebarMenuAction` is a CollapsibleTrigger in `nav-main`; `SidebarMenuButton`
is a DropdownMenuTrigger in `nav-user`; six further consumer files style trigger elements.

`button.tsx` needed both paths unified: its 14 `data-[state=open]` utilities served the
`selected` prop *and* Radix's trigger attribute at once. `selected` now stamps
`data-popup-open`. Without this, every ghost/outline Button used as a dropdown trigger
would have silently lost its open-state background — a regression no type check catches.

Other rewrites: collapsible Panel selectors across 9 files, accordion Item/peer
selectors, checkbox `data-checked`, `field.tsx` `has-data-[checked]`.

Remaining `data-[state=` in the repo is **only self-set attributes**, verified by hand:
sidebar expanded/collapsed, TanStack row `selected`, and `header.tsx`'s own menu toggle.

`useControllableState` had no Base UI equivalent and was the last thing blocking
dependency removal; replaced with `hooks/use-controllable-state.ts` (~60 lines) matching
the Radix contract.

## Left alone (non-Radix, per the skill's hard rules)

`chart.tsx` (recharts), `drawer.tsx` (vaul), `input-otp.tsx`, sonner, react-day-picker.
Also `inline-combobox.tsx` (Ariakit) and all Plate/ProseMirror editor nodes.

## Final state vs baseline

| Check | Baseline | Now |
|---|---|---|
| `tsc --noEmit --incremental false` | 0 errors | **0 errors** |
| `pnpm build` | passes | **passes** |
| `pnpm test:unit` | 73 passed / 23 skipped | **73 passed / 23 skipped** |
| biome (`ultracite check`) | 678 | **678** |
| Radix imports | 24 files | **0** |

Always use `--incremental false` (or delete `tsconfig.tsbuildinfo` first): the
incremental cache reported false zeros twice during this work, once hiding two real
errors in `badge.tsx`.

## Behaviour changes — read before QA

Flagged, never patched, per the skill's rules. Full detail in the per-component reports.

**Most likely to be noticed:**
1. **alert-dialog: Cancel no longer receives focus on open.** Radix focused it by default;
   Base UI focuses the popup. These are the destructive confirmations (Delete All, chat
   deletion) where the safe default was that Enter hit Cancel.
2. **collapsible: exit keyframe animations may not play.** Base UI defers unmount for CSS
   transitions, not keyframes. Enter animations still fire. Affects 9 reasoning/tool files.
3. **tooltip: the arrow is the highest-risk visual change** — Base UI renders a `<div>`
   rather than an auto-rotated `<svg>`, so per-side positioning is now explicit.
4. **accordion now animates where it previously did not** — `animate-accordion-up/down`
   were never defined in this project, so the FAQ panel was snapping.
5. **dropdown-menu: CheckboxItem/RadioItem no longer close on click** (plain Item still
   does). For the only current usage — column-visibility toggles — this is desirable.
6. **navigation-menu: `NavigationMenuIndicator` and the `viewport` prop are inert.**
   Neither has a Base UI equivalent; both kept as passthroughs, no consumer uses them.
7. **sheet: open/close now share one 300ms duration** (was 500/300 asymmetric).
8. **accordion: arrow-key roving focus removed** (Base UI followed the APG guidance
   update). Tab still works.

Smaller: `collisionPadding`/`arrowPadding` defaults 0 → 5 across all popups; hover-card
open delay 700 → 600ms; nav-menu gains a ~50ms hover-open delay; Base UI Portals render a
wrapper `<div>`; every change callback gains a second `eventDetails` argument.

## Not covered by any automated check

Nothing here was exercised in a browser. The per-component `Verify by hand` sections are
the QA plan; `sidebar.md` matters most, since that shell is what the Eve agent port mounts
into.

Also still outstanding and unrelated to this migration: the **TanStack Table v9 migration
(`ca65251`) has never been visually exercised** — sort, pin, column move, show/hide,
resize and pagination on a page with a List block. Worth folding into the same session,
especially as `data-grid-column-header.tsx` was touched again here.

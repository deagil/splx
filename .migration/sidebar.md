# sidebar

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; the highest-risk file in the project, plus the repo-wide
trigger-attribute sweep it exposed.

## Changed

- `components/ui/sidebar.tsx:4` — `import { Slot } from "@radix-ui/react-slot"` →
  `mergeProps` from `@base-ui/react/merge-props` + `useRender` from
  `@base-ui/react/use-render`. This file used **only** the manual Slot idiom; no other
  Radix primitive was involved.
- **Five `const Comp = asChild ? Slot : "…"` sites converted to `useRender` + `mergeProps`**,
  following the skill's worked example including the mandatory
  `as React.ComponentProps<"tag">` cast on every object literal containing `data-*` keys:
  `SidebarGroupLabel` (div), `SidebarGroupAction` (button), `SidebarMenuButton` (button),
  `SidebarMenuAction` (button), `SidebarMenuSubButton` (a).
  Each keeps `asChild` as its public API — 19 consumers use these heavily and none changed.
- `SidebarMenuAction`'s `showOnHover` open marker: `data-[state=open]:opacity-100` →
  `data-[panel-open]:opacity-100`. It is rendered as a **CollapsibleTrigger** via `asChild`
  in `components/navigation/nav-main.tsx:51`, and collapsible triggers use
  `data-panel-open`.
- `sidebarMenuButtonVariants` (`:487`): `data-[state=open]:hover:*` →
  `data-[popup-open]:hover:*`. `SidebarMenuButton` is rendered as a **DropdownMenuTrigger**
  via `asChild` at `sidebar/sidebar-user-nav.tsx:45` and `navigation/nav-user.tsx:45`, and
  Base UI menu triggers use `data-popup-open`.

### Repo-wide trigger-attribute sweep (surfaced by this migration)

Radix set `data-state="open"` on every open trigger; Base UI splits it by family
(`data-popup-open` for menu/popover/tooltip/select triggers, `data-panel-open` for
collapsible/accordion triggers). Six consumer files style an element that is rendered
*as* a menu trigger, so all were rewritten to `data-[popup-open]`:
`ui/data-grid-column-header.tsx:102`, `sidebar/sidebar-user-nav.tsx:46`,
`sidebar/sidebar-history-item.tsx:75`, `shared/visibility-selector.tsx:67`,
`shared/model-selector.tsx:49`, `navigation/nav-user.tsx:46`.

- `components/ui/field.tsx:120` — `has-data-[state=checked]` → `has-data-[checked]`.
  FieldLabel highlights when it contains a checked Checkbox, and Base UI's checkbox emits
  `data-checked`.
- **`components/ui/button.tsx` — both paths unified onto `data-popup-open`.** Its 14
  `data-[state=open]:*` variant utilities existed to serve two callers at once: the
  wrapper's own `selected` prop (which stamped `data-state="open"`) and Radix setting
  `data-state` when a Button was used as a trigger via `asChild`. Base UI only supplies
  the latter, and under a different name — so `selected` now stamps `data-popup-open`
  instead, and all 14 utilities (including the two parent-combinator forms
  `[[data-state=open]>&]` in the `input` mode) were rewritten. Without this, every
  ghost/outline Button used as a dropdown trigger would have lost its open-state
  background.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder\|Slot" components/ui/sidebar.tsx` → no matches.

Remaining `data-[state=` repo-wide is now only self-set attributes, verified by hand:
`sidebar.tsx` (`data-state={state}`, expanded/collapsed), `table.tsx` and
`data-grid-table.tsx` (`selected`), `header.tsx` (`data-state={menuState && "active"}`).
None are Radix.

## Left alone

- All 19 sidebar consumers — the `asChild` API is preserved, so none needed edits.
- `components/header.tsx` — its three `in-data-[state=active]` selectors read an attribute
  the component sets itself at `:35`. Not Radix, not touched.
- `components/ui/table.tsx`, `components/ui/data-grid-table.tsx` — `data-[state=selected]`
  is TanStack Table's own row attribute.

## Behavior changes

- **Focus/keyboard semantics on `asChild` children may differ.** Radix's Slot merged props
  onto the child and nothing more. Base UI's `useRender` does the same merge, but the
  button-rendering parts elsewhere in the project also negotiate `nativeButton`. These
  five sidebar wrappers are plain polymorphic elements (not Base UI primitives), so no
  `nativeButton` applies — behaviour should be identical, but this is the file to suspect
  first if a sidebar control stops responding to Enter/Space.
- No other deltas: this file never used a Radix primitive with open/close state of its own.

## Verify by hand

This is the shell the Eve agent port will mount into, so it warrants more than a glance.

1. **Collapse and expand** the sidebar (rail toggle and keyboard shortcut). Icon-collapsed
   mode should hide labels, sub-menus and group labels.
2. **Drag-to-resize** the desktop sidebar (added in `ee42a30`) — confirm the cursor changes
   at the edge and the width persists.
3. **Mobile width**: the sidebar should render through Sheet and slide in from the left.
4. **Nav item with children** (`nav-main`): click the chevron action — submenu expands and
   the chevron rotates. This exercises `SidebarMenuAction` as a CollapsibleTrigger *and*
   the `data-panel-open` rename.
5. **User nav menu** (`nav-user` / `sidebar-user-nav`): open it — the `SidebarMenuButton`
   should take its accent background **while the menu is open**. This is the
   `data-popup-open` sweep; if the background no longer highlights, that is the regression.
6. **Chat history item**: hover a row, click the `⋯` action — the action should stay
   visible while its menu is open (`showOnHover` + `data-popup-open`).
7. **Data grid column header**: click a header — the button should take its secondary
   background while the menu is open.
8. **Any ghost Button used as a dropdown trigger** (model selector, visibility selector):
   confirm the open-state background still appears.
9. Tab through sidebar menu buttons and sub-buttons; press Enter on each.

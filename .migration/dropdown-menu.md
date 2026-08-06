# dropdown-menu

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated to Base UI **Menu**; one behaviour default flip flagged.

## Changed

- `components/ui/dropdown-menu.tsx:6` — `DropdownMenu from 'radix-ui'` →
  `Menu from '@base-ui/react/menu'`. Radix's DropdownMenu is Base UI's Menu; all public
  wrapper names (`DropdownMenu*`) are unchanged.
- Part renames:
  - `Sub` → **`SubmenuRoot`**, `SubTrigger` → **`SubmenuTrigger`**
  - menu `Label` → **`GroupLabel`**
  - `ItemIndicator` → **`CheckboxItemIndicator`** / **`RadioItemIndicator`** (Base UI
    splits the single Radix part in two)
  - `Content` → **Portal > Positioner > Popup**
  - `Separator` is re-exported from the generic separator (`Menu.Separator`), so it maps
    straight across.
- **`onSelect` → `onClick`**, absorbed by the wrapper. Six call sites pass `onSelect`
  (`sidebar/sidebar-user-nav.tsx:70`, `sidebar/personalization-panel.tsx:967` and `:975`,
  `sidebar/sidebar-history-item.tsx:123`, `shared/model-selector.tsx:75`,
  `shared/visibility-selector.tsx:89`); none changed.
- `asChild` → `render` shims on `DropdownMenuTrigger` and `DropdownMenuItem`. tsc caught
  the Item case at `shared/model-selector.tsx:71` and `sidebar/sidebar-user-nav.tsx:77`.
- **Highlight moves off DOM focus.** Radix styled the active item with `focus:`; Base UI
  exposes `data-highlighted`. Rewritten on Item, CheckboxItem, RadioItem and
  SubmenuTrigger, including the destructive variant.
- SubmenuTrigger's open marker: `data-[state=open]` → `data-[popup-open]`.
- `DropdownMenuSubContent` now **composes `DropdownMenuContent`** with the skill's
  load-bearing submenu defaults (`align="start" alignOffset={-3} side="right"
  sideOffset={0}`) rather than duplicating the class list.
- `components/ui/data-grid-column-header.tsx:250` — the Radix "keep the menu open"
  idiom `onSelect={(event) => event.preventDefault()}` is replaced with an explicit
  `closeOnClick={false}`.
- Animation → `data-starting-style:` / `data-ending-style:` transitions;
  `origin-[var(--transform-origin)]`.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/dropdown-menu.tsx` → no matches.

## Left alone

- All 10 consumers other than the one-line `closeOnClick` change in
  `data-grid-column-header.tsx`.

## Behavior changes

- **CheckboxItem and RadioItem no longer close the menu on click.** This is the one real
  default flip: Radix closed on select unless prevented; Base UI's `closeOnClick` defaults
  to **`false`** on CheckboxItem/RadioItem (it stays `true` on plain Item, so ordinary
  menu items behave as before). Flagged, not patched — for the only current usage, the
  column-visibility toggles in the data grid, staying open is the *desired* behaviour and
  is exactly what the old `preventDefault` hack was buying.
- `textValue` → `label` for typeahead. No call site used `textValue`.
- All change callbacks gain a second `eventDetails` argument.
- `collisionPadding` / `arrowPadding` defaults change 0 → 5.

## Verify by hand

1. Sidebar → user nav menu: open it, **arrow-key** through items, press Enter. The menu
   should close and the action fire.
2. Model selector: pick a model — menu closes, selection applies.
3. Chat history item → the delete item (destructive variant) should show red on
   hover/keyboard highlight, not just on mouse hover.
4. Data grid column header → **Columns** submenu: it should open to the right, and
   toggling a column must **keep the menu open** while the column shows/hides.
5. Typeahead: open a menu and type the first letters of an item.
6. Escape closes; clicking outside closes.

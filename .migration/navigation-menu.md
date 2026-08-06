# navigation-menu

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; the heaviest restructure of the set, two parts flagged.

## Changed

- `components/ui/navigation-menu.tsx:2` — `from "@radix-ui/react-navigation-menu"` →
  `from "@base-ui/react/navigation-menu"`.
- **Viewport relocated.** Radix mounted Viewport directly inside Root; Base UI requires
  `Portal > Positioner > Popup > Viewport`. `NavigationMenuViewport` now renders that
  whole chain, so `NavigationMenu` still just renders `{children}` plus
  `<NavigationMenuViewport />` and no call site sees the difference.
- **Trigger chevron → `Icon` part.** `<ChevronDownIcon>` is now passed via
  `<NavigationMenuPrimitive.Icon render={<ChevronDownIcon />}>`, and the rotation hook
  moves from `group-data-[state=open]` to `group-data-[popup-open]`.
- `navigationMenuTriggerStyle`: `data-[state=open]:*` → `data-[popup-open]:*` (4 utilities).
- **Content animation rewritten.** Radix's `data-motion` (`from-start` / `to-end` etc.)
  has no Base UI equivalent; the direction hook is `data-activation-direction`
  (`left` / `right`). The eight `data-[motion^=…]` utilities are replaced with
  transition-based rules keyed on `data-activation-direction` combined with
  `data-starting-style` / `data-ending-style`.
- CSS vars: `--radix-navigation-menu-viewport-height/width` →
  `--positioner-height/width` on the Positioner, plus `--transform-origin` on the Popup.
- `asChild` → `render` shim on `NavigationMenuLink`. **All five call sites wrap a Next.js
  `<Link>`**, so this one is load-bearing — tsc caught it at `custom/topnav.tsx:129,270`
  and `customized/navigation-menu/navigation-menu-06.tsx:139,206,227`.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/navigation-menu.tsx` → no matches.

## Left alone

- Both consumers — `components/custom/topnav.tsx` and
  `components/customized/navigation-menu/navigation-menu-06.tsx` — needed no edits.
  Neither imports `NavigationMenuViewport` or `NavigationMenuIndicator` directly.

## Behavior changes

- **`NavigationMenuIndicator` is now inert.** Base UI has no Indicator equivalent (the
  skill's hard rule: inert passthrough + flag). It still exports and still renders the
  same rotated-square arrow markup, but it is no longer driven by the primitive, so it
  will not track or animate between triggers. **No consumer uses it**, so nothing is
  visibly broken today — but it must not be adopted as-is.
- **The `viewport` prop is inert.** Base UI removed Radix's `viewport` boolean; the
  viewport always lives in the Positioner chain. The prop is still accepted (and still
  sets `data-viewport` for the group selectors) so call sites do not break, but it no
  longer switches layout modes. Neither consumer passes it.
- The `group-data-[viewport=false]/navigation-menu:*` block — roughly 20 utilities that
  styled the non-viewport inline mode — was dropped along with it, since that mode no
  longer exists.
- Base UI adds a ~50ms open delay on hover that Radix did not have.
- Radix's `data-motion` slide-in/out distances (52 units) are not reproduced exactly; the
  replacement uses a half-width translate.

## Verify by hand

1. Open the top nav (`custom/topnav.tsx`) and hover a trigger with a submenu. The panel
   should open below, in a bordered popover card.
2. Move between two adjacent triggers — the panel should resize and slide in the
   direction of travel (this is the `data-activation-direction` rewrite).
3. Confirm the **chevron rotates 180°** while its menu is open.
4. Click a link inside the panel — navigation should work, since every link is a Next.js
   `<Link>` passed through `render`.
5. Move the pointer away — the panel should fade/scale out, not vanish.
6. Note the slight open delay on hover (new, ~50ms).

# accordion

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated; the animation is now actually functional, see below.

## Changed

- `components/ui/accordion.tsx:4` — `from "@radix-ui/react-accordion"` (namespace import)
  → `from "@base-ui/react/accordion"` (named).
- `Content` → `Panel`. Wrapper export stays `AccordionContent`.
- **Root props adapted rather than passed through.** Base UI changed three things at
  once, and the wrapper absorbs all of them so the call site is unchanged:
  - `type="single" | "multiple"` → a `multiple` boolean (single is the default).
  - `collapsible` dropped — Base UI single mode is always collapsible. The one call site
    passed `collapsible`, so this is a no-op for us.
  - `value` / `defaultValue` / `onValueChange` are **always arrays** in Base UI, even in
    single mode. The wrapper wraps scalars going in and unwraps `[0]` coming out.
- `components/ui/accordion.tsx:78` — Trigger's open marker is `data-panel-open`, not
  `data-open` (trigger-specific, same as collapsible). So
  `[&[data-state=open]>svg]:rotate-180` → `[&[data-panel-open]>svg]:rotate-180`.
- `components/ui/accordion.tsx:78` — added `aria-disabled:*` variants alongside
  `disabled:*`, per the skill's accordion note.
- `components/faqs-section-three.tsx:57,67` — Item emits `data-open` presence:
  `data-[state=open]:` → `data-[open]:` (2 utilities) and
  `peer-data-[state=open]:opacity-0` → `peer-data-[open]:opacity-0`.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/accordion.tsx` → no matches.

## Left alone

- Nothing skipped. `components/faqs-section-three.tsx` is the only consumer.

## Behavior changes

- **The open/close animation now works, where before it did nothing.** The Radix version
  referenced `animate-accordion-up` / `animate-accordion-down`, which are **not defined
  anywhere in this project** — there is no `tailwind.config` (components.json sets
  `"config": ""`) and no matching `@keyframes` in `app/globals.css`. So the panel was
  snapping open and closed. The Base UI version uses a real height transition driven by
  `--accordion-panel-height` with `data-starting-style:h-0` / `data-ending-style:h-0`.
  This is a visible improvement, not a regression, but it *is* a change: the FAQ section
  will now animate where it previously did not.
- Radix's roving arrow-key focus is gone — Base UI removed it following the APG guidance
  update, and `orientation` / `loopFocus` are deprecated no-ops. Arrow keys no longer
  move between accordion triggers; Tab still does. Flagged, not patched.
- `onValueChange` gains a second `eventDetails` argument, hidden behind the wrapper's
  adapter.

## Verify by hand

1. Open the marketing FAQ section (`faqs-section-three`).
2. Click a question → the panel should now **slide** open over ~200ms rather than snap,
   the chevron should rotate 180°, and the item background should go muted.
3. Click the same question again → it should close (single mode is always collapsible).
4. Click a different question → the first should close as the second opens.
5. Confirm the `<hr>` under an open item fades out (`peer-data-[open]:opacity-0`).
6. Tab through the triggers — Tab works; note that arrow keys no longer navigate between
   them (expected, see behaviour changes).

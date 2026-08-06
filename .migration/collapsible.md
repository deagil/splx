# collapsible

2026-08-06 — transformation engine (legacy `default` style: classification only, no
golden replay). Migrated, plus a 10-file consumer sweep. One behaviour delta flagged.

## Changed

- `components/ui/collapsible.tsx:4` — `from "@radix-ui/react-collapsible"` (namespace
  import form) → `from "@base-ui/react/collapsible"` (named import).
- `components/ui/collapsible.tsx` — `Content` → `Panel`. The wrapper export stays
  `CollapsibleContent` so no call site renames.
- `asChild` shim added to **both** `Collapsible` (Root) and `CollapsibleTrigger`,
  translating to Base UI's `render`. Root needed it because
  `components/navigation/nav-main.tsx:41` renders the collapsible *as* a
  `SidebarMenuItem` (`<li>`) rather than wrapping one — tsc caught this.
- Consumer data-attribute sweep across 10 files. Two distinct targets, which is why
  this could not be a single blanket rename:
  - **Panel** emits `data-open` / `data-closed`:
    `data-[state=open]` → `data-[open]`, `data-[state=closed]` → `data-[closed]`.
  - **Trigger** emits `data-panel-open` (trigger-specific name, *not* `data-open`):
    `group-data-[state=open]` → `group-data-[panel-open]` in
    `elements/tool.tsx`, `elements/task.tsx`, `ai-elements/tool.tsx`,
    `ai-elements/task.tsx`; and `components/navigation/nav-main.tsx:52`, where
    `SidebarMenuAction` *is* the trigger via `asChild`, so
    `data-[state=open]:rotate-90` → `data-[panel-open]:rotate-90`.
- `components/elements/task.tsx:65` and `components/ai-elements/task.tsx:58` gained
  `nativeButton={false}`. Both render a `<div>` through `asChild`; Base UI needs to know
  the rendered element is not a native button so it supplies `role="button"` and
  keyboard handling. This is an accessibility *improvement* over the Radix version,
  where the div received trigger props but no button semantics.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/collapsible.tsx` → no matches.
`grep -n "data-\[state=" <10 consumer files>` → no matches.

## Left alone

- `components/elements/web-preview.tsx:223` keeps its `data-[side=bottom]` /
  `[side=left]` / `[side=right]` / `[side=top]` slide utilities. These are vestigial
  copy-paste from a popover — `CollapsibleContent` never emitted `data-side` under Radix
  either, so they were already inert. Pre-existing noise, not a migration artifact.
- `components/elements/*` and `components/ai-elements/*` are near-duplicate copies of
  each other. Both were swept identically rather than deduplicated; consolidation is out
  of scope here (and `ai-elements` is slated for replacement in the Agent C port).

## Behavior changes

- **Exit animations may not play.** The consumer classes are tailwindcss-animate
  keyframes (`animate-out`, `fade-out-0`, `slide-out-to-top-2`) gated on the closed
  state. Radix deferred unmount until its own animation bookkeeping finished; Base UI
  defers unmount for CSS *transitions* via `data-ending-style`, not for keyframe
  animations. The enter animations still fire. Per the skill's rules this is flagged,
  not patched — converting to `data-starting-style:` / `data-ending-style:` transitions
  is a restyle of nine consumer files and belongs in its own pass.
- `onOpenChange` gains a second `eventDetails` argument. No call site reads it.

## Verify by hand

1. Sidebar → a nav item with children: click the chevron action. The submenu should
   expand, and the chevron should rotate 90°.
2. Chat message with a tool call: click the tool header. It should expand, and the
   chevron should rotate 180° (this exercises the `group-data-[panel-open]` rename).
3. Chat message with reasoning: expand and collapse. Confirm the *open* animation still
   plays; note whether the close is instant (expected — see behaviour changes).
4. Tab to a Task trigger and press Enter/Space — it should toggle. This exercises the
   `nativeButton={false}` semantics on the div-rendered trigger.

# progress

2026-08-06 — transformation engine (splx is on legacy style `default`, which per the
skill gets classification-only, no golden replay). Migrated; restructured, one behaviour
delta flagged.

## Changed

- `components/ui/progress.tsx:4` — `from "radix-ui"` → `from "@base-ui/react/progress"`.
- `components/ui/progress.tsx:8-36` — **restructured**. Radix was `Root > Indicator`;
  Base UI is `Root > Track > Indicator`. The Indicator now sizes itself — it writes
  `width: N%` and `insetInlineStart: 0` inline
  (`@base-ui/react/progress/indicator/ProgressIndicator.js:30-33`) — so Radix's manual
  `style={{ transform: translateX(-${100 - (value || 0)}%) }}` is deleted rather than
  ported. Indicator is `absolute`, Track is `relative`, which is what makes
  `insetInlineStart` apply.
- The visual track background deliberately stays on **Root**, not Track. Base UI's
  idiom would put it on Track, but both call sites style the bar through Root's
  className (`h-2 bg-muted`), so moving it would silently break them. Track is a
  transparent full-size positioning layer.
- Dropped `React.forwardRef` + `displayName` in favour of a plain function component,
  matching the other migrated wrappers (React 19 passes ref as a prop). No call site
  takes a ref to Progress.
- `value` is required on Base UI's Root but stays optional on the wrapper, forwarded as
  `value ?? null`.

Leftover scan clean:
`grep -n "radix-ui\|@radix-ui\|IconPlaceholder" components/ui/progress.tsx` → no matches.

## Left alone

- `components/sidebar/chat-status-bar.tsx:90` and `components/elements/context.tsx:138`
  — both call sites are `<Progress className="h-2 bg-muted" value={usedPercent} />` and
  needed no edit.

## Behavior changes

- **Absent `value` now means indeterminate, not 0%.** Radix's wrapper computed
  `100 - (value || 0)`, so a missing value rendered an empty bar. Base UI treats
  `value == null` as indeterminate. Both current call sites always pass a number, so
  nothing changes today — but new code omitting `value` will get an indeterminate bar
  rather than an empty one. Flagged, not patched.

## Verify by hand

1. Open the chat sidebar and expand the context/usage panel.
2. The token-usage bar should fill left-to-right in proportion to usage, with the same
   height (`h-2`) and muted background as before.
3. Send a message and confirm the bar animates smoothly to its new width
   (`transition-all` is on the Indicator).

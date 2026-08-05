## Learned User Preferences

- Prefer an in-code constant for experimental UI toggles (for example chat panel side) before building user-facing preference controls.
- When the chat sidebar is on the left, mirror its header controls so close/resize sit on the outer (left) edge and history on the inner (right) side.
- Chat open/close should crossfade the top-nav Chat trigger with the sidebar header controls (~250ms); collapse the trigger’s layout space when open (not opacity alone), and keep sidebar controls non-interactive until the fade-in finishes.
- Keep the Chat top-nav trigger in document flow (not absolutely positioned) so TopNav reserves space for it when the sidebar is closed.
- Pin the Chat trigger to the far header edge (left or right by sidebar side); constrain only the main nav items to the page max-width column.
- Use singular “Automation” for the top-level nav label and routes (not “Automations”).
- Automation subpages (Events, Listeners, Workflows) should stay single-purpose — no secondary “bonus” sections on the same route.

## Learned Workspace Facts

- Chat sidebar side is controlled by `CHAT_SIDEBAR_SIDE` in `components/sidebar/chat-sidebar-side.ts` and drives panel edge, flex order, trigger placement, and header control mirroring.
- Next.js Instant: keep uncached auth (`getAuthenticatedUser`) inside Suspense as a sibling of `{children}` in `app/(app)/layout.tsx`; pages that call auth or tenant context (`resolveTenantContext`, `requireDevAccess`) also need their own Suspense wrappers around the async work.
- TanStack Table v9: use `useLegacyTable` and row-model helpers from `@tanstack/react-table/legacy` rather than `useReactTable` / `getCoreRowModel` from the main package.
- Automation UI lives under `/automation/*` (Events, Listeners, Workflows); workflows design is documented in `docs/WORKFLOWS.md` on top of the control-plane event model in `docs/API_CONTROL_PLANE.md`.
- Workflows split three concepts: append-only `event_logs` (facts), `workflow_schedule` (queue/leases/retries), and `workflow_runs` (execution). `emitEvent()` fans out matching schedule rows in the same transaction — no dispatch cursor.
- Claudia’s Postgres-function workflow docs are not Splx’s architecture; only product ideas (action catalog, step shapes) transfer.

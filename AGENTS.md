## Learned User Preferences

- Prefer an in-code constant for experimental UI toggles before building user-facing preference controls.
- When the chat sidebar is on the left, mirror its header controls so close/resize sit on the outer (left) edge and history on the inner (right) side.
- Chat open/close should crossfade the top-nav Chat trigger with the sidebar header controls (~250ms); collapse the trigger’s layout space when open (not opacity alone), and keep sidebar controls non-interactive until the fade-in finishes. Keep the Chat trigger in document flow pinned to the far header edge (left or right by sidebar side); constrain only the main nav items to the page max-width column.
- Use singular “Automation” for the top-level nav label and routes (not “Automations”).
- Automation subpages (Events, Listeners, Workflows) should stay single-purpose — no secondary “bonus” sections on the same route.
- Chat sidebar width: allow drag-resize in regular desktop mode only (not expanded), with opinionated min/max guardrails so users cannot overshrink the main content or overgrow the panel.
- When cleaning up Ultracite/Biome lint, prefer fixing offenders over dialing back or disabling rules.
- Chat sidebar empty state should use the shared animated `Greeting` (not a plain “No messages yet” placeholder), including when Eve is enabled; vertically center it in the message area.
- Chat sidebar footer fade / composer pad should use sidebar background tokens (`--sidebar-background` / `bg-sidebar`), not the page background.
- Agent presence pill (sidebar and closed-sidebar AgentDock) should morph width from the center (Dynamic Island–style), not snap or slide left/right; AgentDock should fade in when the sidebar closes; turn failures surface in the pill (full message, max width ≈ composer) with close/copy — not a separate alert popup.
- Agent ask_question / input-request UX: questionnaire card with purple question icon and title beside the icon; pending uses contrasting `bg-background`; no “Waiting for you” status badge; after answer, settle briefly then fold into the normal tool-call activity feed.
- Tool-call activity feed: new icons/sections should fade and slide into place (Greeting-like reveal for questionnaire/todos), not pop in instantly.

## Learned Workspace Facts

- Chat sidebar side is persisted in localStorage (`chat-sidebar-side`) via `useChatSidebarSide()` / `chat-sidebar-side.ts`; it drives panel edge, flex order, trigger placement, header mirroring, and the status-bar side-toggle button.
- Chat sidebar regular-mode width is user-resizable via `components/sidebar/chat-sidebar-resize.ts` (persisted percent, min/max rem and viewport caps); resize is disabled in expanded mode and when an artifact is visible.
- Next.js Instant: keep uncached auth (`getAuthenticatedUser`) inside Suspense as a sibling of `{children}` in `app/(app)/layout.tsx`; pages that call auth or tenant context (`resolveTenantContext`, `requireDevAccess`) also need their own Suspense wrappers around the async work.
- TanStack Table v9: use `useLegacyTable` and row-model helpers from `@tanstack/react-table/legacy` rather than `useReactTable` / `getCoreRowModel` from the main package.
- Automation UI lives under `/automation/*` (Events, Listeners, Workflows); workflows design is documented in `docs/WORKFLOWS.md` on top of the control-plane event model in `docs/API_CONTROL_PLANE.md`.
- Workflows split three concepts: append-only `event_logs` (facts), `workflow_schedule` (queue/leases/retries), and `workflow_runs` (execution). `emitEvent()` fans out matching schedule rows in the same transaction — no dispatch cursor.
- Claudia’s Postgres-function workflow docs are not Splx’s architecture; only product ideas (action catalog, step shapes) transfer.
- Eve sidebar agent is behind `NEXT_PUBLIC_AGENT_RUNTIME=eve` (`agent/`, `components/agent/`; see `docs/EVE_AGENT_PORT.md`). Prompt: `agent/instructions.ts`; models: `agent/lib/models.ts` via AI Gateway; threads: `/api/v1/agent-threads` — sidebar history should use those when Eve is on.
- Eve chat UI can be reviewed without spending tokens via `?agentMock=1` on any `/app` URL (see `components/agent/dev/README.md`).

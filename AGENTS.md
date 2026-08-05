## Learned User Preferences

- Prefer an in-code constant for experimental UI toggles (for example chat panel side) before building user-facing preference controls.
- When the chat sidebar is on the left, mirror its header controls so close/resize sit on the outer (left) edge and history on the inner (right) side.

## Learned Workspace Facts

- Chat sidebar side is controlled by `CHAT_SIDEBAR_SIDE` in `components/sidebar/chat-sidebar-side.ts` and drives panel edge, flex order, trigger placement, and header control mirroring.
- Next.js Instant: keep uncached auth (`getAuthenticatedUser`) inside Suspense as a sibling of `{children}` in `app/(app)/layout.tsx`; pages that call auth or tenant context also need their own Suspense wrappers.
- TanStack Table v9: use `useLegacyTable` and row-model helpers from `@tanstack/react-table/legacy` rather than `useReactTable` / `getCoreRowModel` from the main package.

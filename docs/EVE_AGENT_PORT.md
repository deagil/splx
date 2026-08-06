# Porting the Agent C (Eve) agent into the splx sidebar — Phases 2–5

**Status:** Phase 1 complete and merged to `feat/base-ui-migration`. Phases 2–5 not started.
**Last updated:** 2026-08-06
**Source project:** `~/developer/web/agent` (referred to throughout as **Agent C**)

---

## 1. Goal and scope

Replace the AI-SDK-based agent behind the splx sidebar chat with the **Eve-framework-based
agent from Agent C**, keeping the sidebar shell we already have.

**In scope:** the composer, the messages pane, and the entire runtime behind them —
including Agent C's tool-call UI and the agent presence orb.

**Not in scope (these stay exactly as they are):**
- the sidebar shell — open/close, expand, width, side, drag-to-resize
- the model switcher
- personalisation
- chat history UI

**Dropped from Agent C:** its internal-research focus — the Drive / HubSpot / Notion /
Slack / Tally connectors, citations, memory, artifacts, and the bid-writing skill. splx
functionality gets wired in later (see §7).

### Decisions already settled with the user

| Decision | Choice |
|---|---|
| Runtime | Vercel, **single project**. `withEve()` writes a Build Output `services` entry; Vercel Workflow provides durability |
| Composer | Agent C's contentEditable composer **wholesale**; Plate drops out of the sidebar |
| Chat visual target | **Inherit splx tokens** (zinc HSL vars + the 5 `data-theme` palettes) |
| shadcn style | `base-nova` — **done in Phase 1** |
| Sequencing | Migrate Radix → Base UI **first** — **done in Phase 1** |
| Cutover | **Side-by-side behind a flag**; new `agent_threads` table; existing chat untouched |

---

## 2. What Phase 1 already delivered

Phase 1 (Radix → Base UI migration) is **complete**. 21 commits, ending at `ea29adb`.

- All 20 `components/ui/*` wrappers migrated to `@base-ui/react@1.7.0`
- 21 Radix packages removed; `components.json` `style` flipped to `base-nova`
- 4 dead wrappers deleted (`breadcrumb`, `command`, `toolbar`, `mark-toolbar-button`)
- `hooks/use-controllable-state.ts` added (Base UI has no equivalent)
- Per-component reports in `.migration/`, plus `.migration/project.md`

**Why this mattered for the port:** splx's `components/ui/*` are now the same primitives
Agent C uses, so roughly **20 of Agent C's vendored `ui/*` files become redundant rather
than duplicated** when we bring its chat components over.

**Baseline to preserve** (measure against these, not against a fresh clone):

| Check | Value |
|---|---|
| `npx tsc --noEmit --incremental false` | 0 errors |
| `pnpm build` | passes |
| `pnpm test:unit` | 73 passed / 23 skipped |
| `npx ultracite@latest check` | 678 diagnostics |

> **Always** pass `--incremental false` or `rm -f tsconfig.tsbuildinfo` first. The
> incremental cache reported false zeros twice during Phase 1, once hiding two real errors.

### Outstanding from Phase 1 — do this before starting

Nothing from Phase 1 has been exercised in a browser. Two QA debts carry forward:

1. **The Base UI migration needs a browser pass.** `.migration/project.md` lists eight
   flagged behaviour changes. The one to check first is **alert-dialog no longer focusing
   Cancel on open** — those are the destructive confirmations (Delete All, chat deletion)
   where the safe default was that Enter hit Cancel. Also check the sidebar itself
   (`.migration/sidebar.md`), since it is the shell this port mounts into.
2. **The TanStack Table v9 migration (`ca65251`) has never been visually exercised** —
   sort, pin, column move, show/hide, resize, pagination on a page with a List block.

---

## 3. The two findings that shape everything

### 3.1 Eve is not a library — it is a second server process

`withEve()` mounts a **Nitro server** at `/eve/v1/*`; durable turns run on the Vercel
Workflow SDK. There is no API route to lift out of Agent C and drop into
`app/api/chat/route.ts`. **This is the one genuine architectural commitment in the plan.**

Agent C's `next.config.ts` is the whole integration on the Next side:

```ts
import { withEve } from "eve/next";
export default withEve(nextConfig);
```

### 3.2 The version surface already lines up

| Package | splx | Agent C | Eve peer |
|---|---|---|---|
| `ai` | `^7.0.52` | `^7.0.51` | `^7.0.38` |
| `next` | `16.3.0` | `^16.3.0` | — |
| `react` | `19.2.8` | `^19.2.8` | — |
| `@base-ui/react` | `^1.7.0` | `^1.7.0` | — |
| `zod` | `^4.4.3` | 4.x | — |
| pnpm | `11.20.0` | 11.x | — |

Eve is `^0.30.4` in Agent C. **Eve owns no database tables** and has **zero better-auth
coupling** — its auth contract is a single `AuthFn(request) => principal`, so Supabase
slots straight in.

---

## 4. Phase 2 — Boot Eve inside splx (spike)

Smallest thing that proves the runtime: **one message streams into the sidebar.**

Consider running this on a throwaway branch first to de-risk Eve early, before investing
in Phases 3–5.

### 4.1 Install

```bash
pnpm add eve
```

Then add `eve` to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` — the release-age
gate will otherwise reject it. That file already has the block (line 8); append the
pinned version the same way the `@ai-sdk/*` entries are pinned.

> Note `overrides` and `minimumReleaseAgeExclude` **must** live in `pnpm-workspace.yaml`,
> not the npm-style `overrides` field in `package.json` — pnpm 10+ ignores the latter.
> `package.json` still carries a stale `overrides` block at line 30; it is inert.

### 4.2 Create `agent/` at the repo root

Mirror Agent C's shape but empty of its domain:

| File | Contents |
|---|---|
| `agent/agent.ts` | `defineAgent`, model via AI Gateway |
| `agent/instructions.ts` | **splx persona**, not Agent C's research persona |
| `agent/channels/eve.ts` | the Supabase `AuthFn` (see §4.4) |
| `agent/tools/` | **empty on day one** |

Agent C's `agent/agent.ts` for reference — note `defineDynamic` resolves the model on
`session.started`, which is the hook the model switcher will later write into (§6.3):

```ts
import { defineAgent, defineDynamic } from "eve";

export default defineAgent({
  model: defineDynamic({
    fallback: MODEL_DEFAULTS.chat,
    events: {
      "session.started": async (_event, ctx) => {
        const principalId = ctx.session.auth.current?.principalId;
        // ... resolve per-user model selection
        return { model: selection.model, modelOptions: { providerOptions: { gateway: selection.gateway } } };
      },
    },
  }),
  reasoning: "high",
});
```

The built-in harness gives `web_search`, `todo`, `ask_question`, `agent` and others for
free, so an empty `agent/tools/` still produces a usable agent.

### 4.3 BLOCKER: `proxy.ts` will swallow `/eve/v1/*`

**Verified against the current file (237 lines).** Two independent problems:

**(a) The catch-all matcher.** `proxy.ts:234`:

```ts
"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
```

Next middleware runs **before** `beforeFiles` rewrites, so `/eve/v1/session` matches. It is
not `/api/`, not `/`, not `/whats-new` (`:183`), and not in the exempt list at `:189-191`
→ it gets **redirected to `/signin`** at `:200`.

**(b) Per-request DB work even when authenticated.** An authenticated request still runs
the full proxy body. In **hosted mode** that opens a fresh `postgres()` connection and
runs an onboarding query per request (`proxy.ts:120`), closing it in a `finally`. In
**local mode** it calls `resolveTenantContext()` (`:140`). Either is catastrophic on a
streaming reconnect.

**Fix both ends:**

1. Early-return at the very top of `proxy()`, next to the existing `/ping` guard at `:49`:
   ```ts
   if (pathname.startsWith("/eve/")) {
     return NextResponse.next();
   }
   ```
2. Add `eve` to the matcher's negative lookahead at `:234` so the middleware never runs:
   ```ts
   "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|eve).*)",
   ```

Do both. (1) protects against the matcher being edited later; (2) avoids the middleware
cold-start entirely.

### 4.4 The Supabase `AuthFn`

This runs **inside the Eve Nitro process, not Next** — so `next/headers` is unavailable and
it receives a plain `Request`. Use `createServerClient` from `@supabase/ssr`, reading
cookies off `request.headers`.

Stamp **both** `principalId` (the Supabase user id) **and a `workspaceId` attribute**, so
the agent inherits splx's tenancy.

Keep Agent C's ordering pattern — Eve's default without a channel file is fail-closed.
Agent C's `agent/channels/eve.ts` in full (30 lines) is the template:

```ts
import type { AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { vercelOidc } from "eve/channels/auth";

function appSession(): AuthFn<Request> {
  return async (request) => {
    // splx: createServerClient({ cookies from request.headers }) -> getUser()
    if (!user) return null;
    return {
      attributes: { email: user.email, workspaceId },
      authenticator: "app",
      issuer: "app",
      principalId: user.id,
      principalType: "user",
    };
  };
}

export default eveChannel({ auth: [appSession(), vercelOidc()] });
```

### 4.5 Housekeeping

- `.gitignore` / `.vercelignore`: add `.eve/` and `.output/`. `.vercel` is already ignored.
- `vercel.json` exists and carries the `/api/internal/workflows/tick` cron (every minute).
  `withEve` **merges** it into the generated `.vercel/output/config.json` — **verify the
  cron survives the merge.**
- `next.config.ts` → `export default withEve(nextConfig)`, preserving `cacheComponents`,
  `images`, and the `NEXT_PUBLIC_GIT_BRANCH` env block.
- Env: `AI_GATEWAY_API_KEY`, or `vercel link` for `VERCEL_OIDC_TOKEN`.
- **Confirm Vercel Build Output `services` is enabled for the team** — the entire
  production topology depends on it. Do this in preflight, not at deploy time.

### 4.6 Verify Phase 2

```bash
pnpm dev
curl -i localhost:3000/eve/v1/health     # expect 200, NOT a 307 to /signin
```

Then a throwaway client component calling `useEveAgent()` streams one reply. While a
stream is open, confirm the server log shows **no per-request `postgres()` connection**.

---

## 5. Phase 3 — Thread persistence

Eve adds no tables; persistence is ours. Mirror Agent C's `server/db/schema/threads.ts`.

### 5.1 Migration

`supabase/migrations/*_agent_threads.sql`:

```
agent_threads(
  id           uuid primary key,
  workspace_id uuid not null references workspaces(id),
  user_id      uuid not null references users(id),
  title        text,
  state        jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
)
```

`state` holds Eve's event log plus the cursor
`{ sessionId, continuationToken, streamIndex }`.

**`workspace_id` is non-negotiable** — workspace-scoped like every other splx chat table.

### 5.2 Repository and routes

- Repository in `server/repositories/agent-threads.ts`. Mutations belong in repositories so
  audit entries and events fire for non-HTTP callers (AI tools, the future automation
  runner) too — see `CLAUDE.md`.
- Routes under `app/api/v1/agent-threads/` using `endpoint()` from `server/api/endpoint.ts`
  — declaring `auth`, `permission`, a zod `schema`, and returning the `{ data }` envelope.
  See `docs/API_CONTROL_PLANE.md` **before** adding the route.

### 5.3 Client resume

Mirror `~/developer/web/agent/hooks/chat/use-thread-state.ts`:

- replay the full event log into `initialEvents` + `initialSession`
- persist on `onFinish`, and on `pagehide` / `visibilitychange`
- **never shrink the log server-side**

Existing `chats` / `messages` / `votes` / `streams` tables are **untouched**.

### 5.4 Verify Phase 3

Create a thread, send messages, **hard-refresh mid-stream** → history replays from the
persisted event log. Confirm `workspace_id` is set on every row.

---

## 6. Phase 4 — Port the chat UI

Bring from `~/developer/web/agent` into a new `components/agent/` directory.

### 6.1 What comes over

| Source (in Agent C) | Notes |
|---|---|
| `components/chat/chat-page-client.tsx` | the mount; becomes `AgentSidebarContent` |
| `components/chat/message-list.tsx`, `chat-message.tsx`, `chat-layout.ts`, `chat-error-banner.tsx` | core renderer (~1,400 lines with parts) |
| `components/chat/parts/text-part.tsx`, `tool-part.tsx`, `authorization-part.tsx`, `agent-activity-group.tsx`, `todos-checklist.tsx`, `message-footer.tsx`, `activity-types.ts`, `use-elapsed-seconds.ts`, `use-reasoning-duration.ts` | part renderers |
| `components/ui/agent-activity-section.tsx` | 624 lines — the biggest renderer; reasoning + tool timeline |
| `components/ai-elements/tool.tsx` | **live** — `parts/tool-part.tsx:4` imports it as the fallback tool card |
| `components/ui/composer.tsx` + `composer-skill-chips.tsx` | contentEditable composer + `/` chips |
| `components/ui/message-scroller.tsx`, `agent-orb.tsx`, `input-request-card.tsx` | wrappers |
| `components/chat/agent-presence.tsx` | the floating orb pill above the composer |
| `hooks/chat/use-chat-session.ts`, `use-thread-state.ts` | client session |
| `lib/tool-call-display.ts`, `lib/tool-icons.tsx`, `lib/orb-activity.ts` | the tool-call display engine — see §6.2 |

### 6.2 The tool-call UI comes over whole

This is the visual tool-call rendering with per-tool labels and icons, plus the presence
orb — **explicitly in scope**. Three files drive it, and **all three are registries whose
entries get repopulated, not features that get removed**:

- **`lib/tool-call-display.ts`** — `getToolDisplayInfo(toolName, input)` at line 268 returns
  `{ category, integrationName, showCategory, runningLabel, completedLabel, summaryLabel }`.
  That is the "Searching Drive for *X*" → "Searched Drive for *X*" behaviour. Of its ~14
  branches only **6 are CodeBase-specific** (slack, hubspot, notion, drive, tally,
  platform); swap those for splx tools. The generic branches — bash/development, todos,
  memory, `retrieve_tools`, `web_search`, `web_fetch`, subagent handoff, and the `general`
  fallback — **stay untouched** and already cover the built-in harness tools.
- **`lib/tool-icons.tsx`** — a category → icon/tint/accent registry (`iconConfigs`,
  `normalizeCategory`, `getBrandAccentClass`, `getToolCategoryIcon`). Same split: the 6
  brand categories get replaced; `todos`, `development`, `memory`, `web_search`,
  `web_fetch`, `connections`, `question`, `reasoning` stay. Drop `/public/icons/*` brand
  images with them.
- **`lib/orb-activity.ts`** — `SEARCH_CATEGORIES` / `SHAPE_CATEGORIES` map tool categories
  to orb states. Repopulate the sets; keep the mapping.

Until splx tools are wired (§7), unmatched tools fall through to the `general` branch and
**still render correctly** — just with generic labels.

### 6.3 What does NOT come over

**Zero importers — verified. Do not bring:**
`components/ui/tool-calls-section.tsx` (superseded by `agent-activity-section.tsx`),
`ai-elements/prompt-input.tsx` (1462 lines), `code-block.tsx` (562), `confirmation.tsx`,
`sources.tsx`, `parts/reasoning-part.tsx`.

**Redundant after Phase 1** — splx's own base-nova wrappers now cover them: the ~20
primitives in Agent C's `components/ui/`. Only `bubble.tsx` needs checking (it uses
`useRender` / `mergeProps` from `@base-ui/react` specifically and may not exist in splx's
set).

**Strip the research-agent coupling** — these are *domain features*, distinct from the
tool-call display engine above, which is kept:
- `lib/citations.ts` (616 lines) + `parts/citation-icon.tsx` + `parts/inline-citation.tsx` —
  hostname matchers for hubspot/slack/drive/notion/tally, and the `<citation>` /
  `<cite-mark>` Streamdown tags
- `components/ui/composer-ref-chips.tsx` (936 lines) — the `@` menu is a closed
  `"drive" | "notion"` union hitting `/api/composer/refs`. **Keep the chip mechanism, cut
  the data source** — this is what splx's mentions get rewired onto later
- `parts/save-memory-part.tsx`, `parts/artifact-part.tsx`, `parts/thread-highlight-button.tsx`
  — memory, artifacts, feedback. Each is hardcoded **by tool name** (`save_memory`,
  `create_artifact`) in `tool-part.tsx`, `agent-activity-group.tsx` and `orb-activity.ts`;
  removing them means deleting those name checks, **not** the surrounding renderer
- home starter prompts and composer placeholders referencing Drive/HubSpot/`/bid-writing`

### 6.4 New dependencies

- `@base-ui/react` — **already present** from Phase 1
- `@shadcn/react` (`^0.2.1` in Agent C) — its only export is the `message-scroller`
  autoscroll primitive; non-trivial to replace
- `shadcn` (`^4.16.1`) — **CSS only**: supplies the `shimmer`, `shimmer-duration-*` and
  `scrollbar-thin` utilities the chat uses
- `streamdown` plugins: `@streamdown/code`, `-math`, `-mermaid`, `-cjk` (splx already has
  `streamdown@^2.5.0`)
- `thinking-orbs@0.2.0` **plus Agent C's `patches/thinking-orbs@0.2.0.patch`** and the
  matching `pnpm-workspace.yaml` `patchedDependencies` entry
- `motion` — already present (`^12.43.0`)

### 6.5 Styling

The components reference `bg-background` / `text-foreground` etc., so they resolve against
splx's tokens automatically — that is the "inherit splx tokens" decision working for free.
Two things need hand-tuning:

1. Agent C sets `--background: oklch(0.97 0 0)` **deliberately grey** so the floating
   composer card pops. splx's `--background` is white. **Retune the composer card contrast.**
2. Port the chat-specific CSS into `app/globals.css`: `.chat-footer-fade`, the
   `.skill-mention` / `.ref-mention` keyframes, and `shimmer` usage. Skip `[data-paper]`
   (artifacts, out of scope).

**While in `globals.css`, fix a pre-existing conflict.** There are two `@theme inline`
blocks. The first declares `--color-sidebar: var(--sidebar-background)` at line 403 (with
the 7 sibling `--color-sidebar-*` tokens); the second at line 579 **re-declares them and
repoints `--color-sidebar` at `var(--sidebar)`**. The later block wins today. Resolve it
before the sidebar work, not after.

---

## 7. Phase 5 — Mount behind the flag

### 7.1 The seam

`components/sidebar/chat-sidebar.tsx:325` is the seam. `ChatSidebar` never touches
`useChat` — it only knows `hasMessages: boolean` (`:142`) and an opaque `artifactProps`
blob (`:143`). Current call:

```tsx
<ChatSidebarContent
  autoResume={!!chatIdFromUrl}
  chatId={chatId}
  initialChatModel={initialChatModel}
  initialMessages={initialMessages}
  initialVisibilityType={initialVisibilityType}
  isReadonly={isReadonly}
  key={chatId}
  onArtifactPropsReady={setArtifactProps}
  onMessagesChange={handleMessagesChange}
/>
```

Becomes:

```tsx
{process.env.NEXT_PUBLIC_AGENT_RUNTIME === "eve" ? (
  <AgentSidebarContent key={threadId} threadId={threadId} initialThread={thread} />
) : (
  <ChatSidebarContent key={chatId} {...existingProps} />
)}
```

### 7.2 Three things to handle at the seam

1. **`key` is load-bearing.** Eve reads `initialSession` / `initialEvents` **only at store
   creation**, so the component must remount on thread switch. Agent C documents this in
   `hooks/chat/use-chat-session.ts`. The existing `key={chatId}` at `:332` is the precedent.
2. **`ChatStatusBar` re-parents.** The model switcher and personalisation are staying, but
   today they render *inside* the content's `inputSlot` and take `onModelChange` from
   `useChat` state. On the Eve path **model routing is server-side** (Agent C resolves it on
   `session.started` — see §4.2), so the switcher must write a *preference the agent reads*
   rather than a `useChat` argument.
   → Note `components/sidebar/chat-status-bar.tsx` was touched in Phase 1: it now uses Base
   UI's raw `Select.Trigger` primitive with `render` instead of Radix's `Trigger`+`asChild`.
3. **`onArtifactPropsReady`** — the 15-field hoist has no Eve equivalent on day one. The
   Eve branch passes `null`; the legacy branch keeps working unchanged.

### 7.3 Also needed

- `QueryClientProvider` — Agent C's chat requires react-query
- a sonner `<Toaster/>` — splx already has sonner (`^2.0.7`)

---

## 8. Explicitly deferred

Day one is **the agent shell streaming well inside the sidebar, with no splx tools wired.**
Left for follow-up passes, in rough priority order:

1. **`@` mentions** — repoint Agent C's ref-chip menu at splx's `useMentionableItems()` +
   `lib/mentions/global-registry.ts`. Note the sidebar sits *outside*
   `MentionContextProvider`, which is **why that module-level pub/sub singleton exists**; it
   must be preserved.
2. **`/` skills** — repoint the skill-chip menu at `ai_skills` via `/api/user/skills`.
3. **splx tools as Eve tools** (`agent/tools/`): query-user-table, search-pages,
   navigate-to-page — and add a branch per tool to `getToolDisplayInfo`, `tool-icons.tsx`
   and `orb-activity.ts` so they get proper running/completed labels, icons and orb states
   instead of the `general` fallback.
4. **Tool approval** — Eve has first-class HITL (`approval: always()`, `inputRequest`),
   better than splx's current hardcoding to `updateDocument`.
5. **Artifacts in the sidebar.**
6. **History migration** from `chats`/`messages` — lossy; Eve's event log does not
   round-trip cleanly from AI SDK `UIMessage`s.

---

## 9. Verification checklist

**Phase 2**
- `pnpm dev`; `curl -i localhost:3000/eve/v1/health` → **200**, not a 307 to `/signin`
- confirm `proxy.ts` no longer intercepts: no `/signin` redirect, and **no per-request
  `postgres()` connection** on `/eve/v1/session/*/stream`
- one message round-trips into a throwaway component

**Phase 3**
- create a thread, send messages, **hard-refresh mid-stream** → history replays from the
  persisted event log
- confirm `workspace_id` is set on every row

**Phases 4–5**
- **flag off → the existing sidebar behaves exactly as before.** This is the regression that
  matters most
- flag on → composer chips, reasoning timeline, tool activity, orb presence and
  scroll-anchoring all behave as they do in Agent C
- check light **and** dark, plus at least one non-default `data-theme` palette

**Every phase**
- `npx tsc --noEmit --incremental false` → 0
- `pnpm build` → passes
- `pnpm test:unit` → 73 passed / 23 skipped
- `npx ultracite@latest check` → ≤ 678

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| `proxy.ts` catch-all silently breaks streaming | Fix at **both** ends (early return *and* matcher) before writing any client code |
| Vercel Build Output `services` unavailable to the team | Confirm in Phase 2 preflight — it gates the entire production topology |
| Eve `stop()` is client-local; the turn keeps running **and billing** | Own the `ClientSession` (`preserveCompletedSessions: true`) and call `session.cancel({ turnId })` |
| Two long phases before anything is visible | Phase 2 is a deliberately small spike; consider running it on a throwaway branch *before* committing to Phases 3–5 |
| Model switcher silently stops working on the Eve path | It is server-resolved now (§7.2.2) — treat it as a port task, not a wiring task |
| Phase 1's flagged behaviour changes get blamed on the port | Do the Phase 1 browser pass **first** (§2), so the two are never confounded |

---

## 11. Reference

- Original combined plan: `~/.claude/plans/optimized-baking-willow.md`
- Phase 1 re-scope: `~/.claude/plans/prancy-doodling-jellyfish.md`
- Phase 1 outcome: `.migration/project.md` + one file per component
- splx API conventions: `docs/API_CONTROL_PLANE.md` — **read before adding any API route**
- splx DB architecture: `docs/DATABASE_ARCHITECTURE.md`
- Agent C source: `~/developer/web/agent`

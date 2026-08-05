# API Control Plane

Implementation roadmap for a shared `endpoint()` API layer in Splx Studio.
Written so this work can be picked up later without re-deriving context from chat.

**Status:** Phases 1–5 landed. Phases 6–7 outstanding.  
**Canonical repo:** the `deagil/splx` working tree.

> **Implementation notes.** Several things changed relative to the plan below; see
> [Deviations from this plan](#deviations-from-this-plan) for the reasoning.
>
> 1. Permissions use **`resource.action`** dot notation, not `resource:action:scope`.
> 2. `/api/data/[tableName]` had a **live SQL injection**, not just "thin validation".
>    It is fixed, not deferred.
> 3. The `role_permissions` **table is the runtime source of truth**, with the static
>    map as a fallback — rather than the two diverging permanently.
> 4. `role_permissions` is now **workspace-scoped** (nullable `workspace_id`, NULL =
>    global default), so custom workspace roles resolve permissions instead of being
>    denied everything.
> 5. Several routes had **no authorization at all** — `/api/workspace/users` and
>    `/api/workspace/invites` most seriously. Those are closed.

Related docs: [RBAC_SYSTEM.md](./RBAC_SYSTEM.md), [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md), [PAGES_SYSTEM.md](./PAGES_SYSTEM.md), [AI_CHAT_SYSTEM.md](./AI_CHAT_SYSTEM.md).

---

## Why this exists

### Product vision (context)

Splx is intended to grow from “data + page builder + AI chat” into an **organizational operating system**:

- Core data (tables) and system definitions (pages, automations, email templates) are first-class editable objects.
- Business processes are Zapier-style automations: typed events → durable step config → deterministic runner.
- UI builder and AI agent use the **same** mutation APIs.
- Definition changes eventually support draft → review → publish (separate from live instance data).

Agent C (`~/Developer/web/agent`, Eve-based) is a strong **agent runtime** (durable sessions, channels, skills, sandbox). Splx is the stronger **kernel** (workspaces, RBAC, tables, pages). Long-term shape: Splx as system of record; Eve-grade agent as a client of Splx APIs — not a merge of the two products. This doc does **not** implement Eve; it builds the control plane both UI and future agent tools need.

### Immediate problem

Today’s API layer cannot safely support that vision:


| Concern          | Today                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Auth session     | Mostly centralized in `proxy.ts` (Supabase cookies, workspace hint)                                                                     |
| Authorization    | Fragmented — some routes use `resolveTenantContext` + `requireCapability`; workspace admin / chat / helpers use other patterns          |
| Shared wrapper   | **None** — no `withAuth` / `endpoint`; copy-paste `handleError`                                                                         |
| Row mutations    | `/api/data/[tableName]` — raw SQL on resource store, thin validation, **bypasses RLS**                                                  |
| Post-write hooks | **None** — no domain events, no audit trail                                                                                             |
| Request logging  | Ad-hoc `console.*` + generic OTel (`instrumentation.ts` service name `"ai-chatbot"`)                                                    |
| Docs vs code     | `RBAC_SYSTEM.md` describes DB `role_permissions` as SoR; API handlers mostly use a **static** map in `lib/server/tenant/permissions.ts` |


Without a single mutation funnel (auth → permission → validate → write → audit → emit), automations and “agent = same API as UI” cannot be added cleanly.

---



## Target architecture

```text
HTTP → app/api/v1/.../route.ts
     → endpoint({ auth, permission, schema?, handler })
          auth → tenant/roles → checkPermission → Zod body
     → handler({ user, workspace, params, body, requestId, req })
          → repo.* / lib/server/* helpers / getResourceStore()
          → writeAuditLog + emitEvent (on mutations)
     → { data, meta? } → Response.json
     → logRequest stub (requestId, method, path, user, status, duration)
```

```mermaid
flowchart LR
  HTTP["app/api/v1 route"] --> EP["endpoint"]
  EP --> Auth["auth and tenant"]
  EP --> Perm["checkPermission"]
  EP --> Zod["schema.parse"]
  EP --> Handler["handler"]
  Handler --> Repo["repositories or lib.server"]
  Repo --> DB["resource store or Supabase"]
  Repo --> Audit["writeAuditLog"]
  Repo --> Events["emitEvent outbox"]
  EP --> Log["logRequest stub"]
  EP --> JSON["data meta JSON"]
```





### Mental model

Treat routes as **thin adapters**: declare auth + permission + schema; keep handlers focused on orchestration. Prefer repos / `lib/server` for shared mutations. Emit technical events from the base data repo; emit domain events (`order.cancelled`, …) from handlers/lib when the product meaning is known. Always scope by `workspace_id` (or tenant resource store) outside the base repo.

---



## Decisions (locked)


| Decision           | Choice                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrapper            | `endpoint({ auth, permission, schema?, handler })` — same shape as the CodeBase-style internal API pattern                                            |
| Do not port        | Creator-staff / mentorship role loaders and other domain-specific wrapper branches from that other project                                            |
| Layout             | New `server/` tree for control plane; call into existing `lib/server/**` initially (no big-bang move of pages/tables)                                 |
| Permissions        | ~~Declarative `resource:action:scope` strings~~ → **superseded**: dot notation `resource.action`, matching `role_permissions` and the RLS helpers. See [Deviations](#deviations-from-this-plan). |
| Response shape     | `{ data, meta? }`; shared `unauthorized` / `forbidden` / `handleError`; map `Unauthorized` → **401** (today many routes map it to 500)                |
| Repos              | Hybrid: domain repos for pages / tables / reports; `createDataRepository` (or equivalent) for dynamic row CRUD with audit + technical events built in |
| Events             | `emitEvent()` → `event_outbox`; failures **log, do not throw**                                                                                        |
| Event kinds        | System: `db.<table>.created | updated | deleted`; Product: named later (`signup.accepted`, …)                                                         |
| Audit              | `writeAuditLog()` → `audit_logs` on mutations                                                                                                         |
| Request logging    | Stub `console.log` with structured fields + `requestId` until a real sink exists                                                                      |
| Streaming          | Chat / SSE **out of** success-JSON `endpoint`; auth+permission only or a later `streamEndpoint`                                                       |
| Versioning         | New routes under `/api/v1/`; migrate callers; old routes re-export or deprecate                                                                       |
| Resource SQL / RLS | `/api/data` still uses privileged resource-store SQL. Controls are capability + column validation + parameterised statements + audit. **The SQL injection this understated was fixed, not deferred** — see [Deviations](#deviations-from-this-plan). |


---



## Proposed file tree

As built (Phases 1–5). `✅` exists, `⬜` still to come.

```text
server/
  api/
    endpoint.ts          ✅ wrapper
    auth.ts              ✅ resolveTenantContext → EndpointUser adapter
    responses.ts         ✅ unauthorized, forbidden, handleError, success, ApiError
    responses.test.ts    ✅
    legacy.ts            ✅ delegateToV1 — flattens the envelope for pre-v1 paths
    types.ts             ✅ EndpointUser / EndpointContext / EndpointConfig
  permissions/
    definitions.ts       ✅ Permission union, aliases, DEFAULT_ROLE_PERMISSIONS
    match.ts             ✅ pure matcher + workspace-override resolver
    match.test.ts        ✅
    effective.test.ts    ✅ override semantics, mirrored against the SQL helper
    check.ts             ✅ DB-backed checkPermission, per-workspace cache
  repositories/
    data.ts              ✅ row CRUD + column validation + audit + db.* events
    data.test.ts         ✅ injection, tenant predicate, pagination
    data.integration.test.ts ✅ the same against a real Postgres (opt-in)
    workspace-users.ts   ✅ membership: role changes, removal, owner/last-admin
    workspace-invites.ts ✅ invites: create, list, revoke
    index.ts             ⬜ unified `repo` export
    pages.ts             ⬜ routes call lib/server/pages directly
    tables.ts            ⬜
    reports.ts           ⬜
  lib/
    db.ts                ✅ pooled main-DB client for control-plane tables
    audit.ts             ✅ writeAuditLog → audit_logs
    events.ts            ✅ emitEvent → event_outbox
    safe-url.ts          ✅ SSRF guard for URL-fetching routes
    safe-url.test.ts     ✅
    event-descriptions.ts ⬜ nothing renders these yet

lib/server/tables/
  list-physical.ts       ✅ extracted from app/api/tables/route.ts
  sync.ts                ✅ extracted from app/api/tables/sync/route.ts

supabase/migrations/
  20260805120000_audit_logs_and_event_outbox.sql          ✅
  20260805130000_workspace_scoped_role_permissions.sql    ✅

app/api/v1/
  data/[tableName]/route.ts          ✅
  data/[tableName]/schema/route.ts   ✅
  pages/route.ts                     ✅
  pages/[pageId]/route.ts            ✅
  pages/[pageId]/save/route.ts       ✅
  tables/route.ts                    ✅
  tables/[tableId]/route.ts          ✅
  tables/metadata/route.ts           ✅
  tables/sync/route.ts               ✅
  tables/generate-pages/route.ts     ✅
  reports/route.ts                   ✅
  reports/[reportId]/route.ts        ✅
  reports/execute/route.ts           ✅
  workspace/users/route.ts           ✅
  workspace/roles/route.ts           ✅
  workspace/invites/route.ts         ✅
  workspace-apps/[type]/route.ts     ✅

vitest.config.ts                     ✅ scoped to server/**/*.test.ts
```

Every pre-v1 path above still works: it re-exports its v1 handler through
`delegateToV1`, which flattens `{ data, meta }` back to the old flat shape. That
keeps existing UI fetches working without a coordinated front-end change. Delete a
delegator once nothing fetches its path.

`server/repositories/index.ts` was skipped deliberately: a `repo` barrel export that
re-exports a single repository adds indirection without value. Add it when there are
three or more.

**Keep using (do not delete):**

- `lib/server/tenant/context.ts` — tenant resolution
- `lib/server/tenant/resource-store.ts` — local vs hosted DB
- `lib/server/pages`, `lib/server/tables`, `lib/server/reports`, `lib/server/data`
- `proxy.ts` — session cookie refresh + workspace header (middleware stays; wrapper re-checks)

**Replace over time:**

- Direct `requireCapability` / static `"pages.edit"` strings in route handlers → declarative permissions on `endpoint`
- Per-route `handleError` copies → `server/api/responses.ts`

---



## Permissions sketch

Start by mapping today’s static capabilities (`[lib/server/tenant/permissions.ts](../lib/server/tenant/permissions.ts)`) into declarative form. Fix known bugs while doing so:


| Bug                                                    | Status | Fix                                                                 |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------- |
| Routes require `data.read` but map has `data.view`     | ✅ done | `data.read` canonicalised to `data.view` in `definitions.ts`         |
| `workspace.manage` used but not in map                 | ✅ done | Seeded for admin in the Phase 2 migration                            |
| `/api/tables` GET gated on `pages.view`                | ✅ done | Now `tables.view`                                                    |
| No `resource.*` wildcard expansion in TS               | ✅ done | `server/permissions/match.ts`, matching `user_has_access()` in SQL   |
| Static map missing every `reports.*` / `chat.*` grant  | ✅ done | Static map is now derived from `DEFAULT_ROLE_PERMISSIONS`            |
| Workspace users/roles/invites lack RBAC                | ⬜ open | Phase 5 — `/api/workspace/users` still has a `TODO` and no check     |


Example role mapping (initial):


| Role    | Permissions (illustrative)                                   |
| ------- | ------------------------------------------------------------ |
| admin   | `*`                                                          |
| builder | pages/tables/reports edit+view; data view/create/edit/delete |
| user    | pages/tables view; data view/create/edit/delete              |
| viewer  | pages/tables/data view only                                  |


Expand later: `automations:edit:workspace`, `automations:publish:workspace`, `templates:edit:workspace`.

**Note:** the reconciliation this section anticipated was done up front rather than
deferred. `role_permissions` is the runtime source of truth for API-handler
authorization: `server/permissions/check.ts` reads it (cached 60s) and falls back to
`DEFAULT_ROLE_PERMISSIONS` only when the table is unreachable. RLS continues to guard
Supabase-client paths using the same rows and the same wildcard semantics.

Remaining divergence risk: the static fallback map in `definitions.ts` must be kept in
step with the migration's seed by hand. If you add a permission, add it in both.

---



## Example route (target)

The shipped version (`app/api/v1/data/[tableName]/route.ts`):

```ts
import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import { dataRepository } from "@/server/repositories/data";

// The envelope only — a JSON object, not an array or scalar. Keys are validated
// against the table's real columns inside the repository, which is the only
// place that knows them.
const rowSchema = z.record(z.string(), z.unknown());

export const PATCH = endpoint<Record<string, unknown>, { tableName: string }>({
  auth: "required",
  permission: "data.edit",
  schema: rowSchema,
  async handler({ user, params, body, query, requestId }) {
    const recordId = query.get("id");
    if (!recordId) {
      throw new ApiError(400, "Record ID is required");
    }

    const repo = dataRepository({ tenant: user.tenant, requestId });
    const record = await repo.update(params.tableName, recordId, body);
    if (!record) {
      throw new ApiError(404, "Record not found");
    }

    // repo.update: parameterised SQL → writeAuditLog → emitEvent('db.<table>.updated')
    return { data: { record } };
  },
});
```

Handlers stay orchestration-only. Audit and technical events live in the repository so
that non-HTTP callers — AI tools, a future automation runner — get them too.

---



## Current capability inventory (baseline)

Use this when migrating; do not assume README claims over code.


| Area                            | Status  | Notes                                                         |
| ------------------------------- | ------- | ------------------------------------------------------------- |
| Workspaces / RBAC roles         | Exists  | admin/builder/user/viewer; nav polish incomplete              |
| Dynamic tables + `/api/data`    | Exists  | Mutate path is the priority for v1                            |
| Pages / blocks                  | Exists  | Trigger **execute** is a stub (`useTriggerBlockAction` no-op) |
| Reports                         | Exists  |                                                               |
| Documents / chat artifacts      | Exists  | Chat side-products, not system definitions                    |
| AI tools write path             | Partial | Documents only; no page/table/automation mutations            |
| Events / webhooks / automations | Missing | Workflows nav “Coming soon”                                   |
| Email templates as entities     | Missing | Only product release emails                                   |
| Draft → publish for definitions | Missing | Page “draft” = in-memory; autosave writes live                |
| Central audit / request log     | Missing |                                                               |


---



## Implementation phases



### Phase 0 — Doc + agreement (this document)

No code. Align on decisions above.

### Phase 1 — Foundation ✅ done

1. ✅ `server/api/{endpoint,auth,responses,types}.ts`.
2. ✅ `server/permissions/{definitions,check,match}.ts`. `data.read` is canonicalised
   to `data.view`; `workspace.manage` is seeded for admin.
3. ✅ Adapter: `resolveTenantContext` → `EndpointUser` (`server/api/auth.ts`).
4. ✅ Unit tests for permission matching and error mapping (Vitest, `pnpm test:unit`).

**Exit met:** `/api/v1/data/[tableName]` proves the wrapper (a throwaway health route
was unnecessary).

Also fixed in this phase:

- `lib/server/tenant/permissions.ts` now shares the same definitions and wildcard
  matcher, so the 17 routes still on `requireCapability` get the corrected grants too.
- `/api/tables` GET gated on `pages.view`; now `tables.view`.
- `proxy.ts` returns JSON 401 for unauthenticated `/api/*` instead of a 307 to the
  HTML signin page, and no longer fires the onboarding redirect at API paths
  (closes risk #3 below).
- Local-mode privilege escalation in `resolveTenantContext` — see
  [Deviations](#deviations-from-this-plan).

### Phase 2 — Audit + event outbox tables ✅ done

1. ✅ `supabase/migrations/20260805120000_audit_logs_and_event_outbox.sql`.
2. ✅ `server/lib/audit.ts`, `server/lib/events.ts` — both catch-and-log.
3. ⬜ `event-descriptions.ts` — skipped; nothing renders these yet.

Both tables are mirrored in `lib/db/schema.ts`. RLS is on with select-only policies
for workspace members; writes go through the privileged connection only.

### Phase 3 — Data API v1 ✅ done

1. ✅ `server/repositories/data.ts` — table config load, column validation,
   parameterised INSERT/UPDATE/DELETE, `writeAuditLog` + `emitEvent`.
2. ✅ `app/api/v1/data/[tableName]/route.ts`.
3. ✅ Legacy `/api/data/[tableName]` is a thin delegator that flattens the
   `{ data, meta }` envelope back to the old shape. It exists because the page-block
   generator writes `/api/data/${tableConfig.id}` into saved page configs, so those
   URLs are persisted in the `pages` table and cannot be changed by editing code
   alone. Delete it once saved configs are migrated.
4. ✅ Path contract documented: the segment is the table **config id**; the physical
   name is resolved from config and verified against `information_schema`.

**Note on validation:** bodies are validated against the table's **real columns**, not
`config.field_metadata`. The latter is `.optional().default([])`
(`lib/server/tables/schema.ts:71`), so validating against it would reject every write
to a table that has no metadata — which is most of them.

### Phase 4 — Pages / tables / reports mutations ✅ done

1. ✅ All of pages / tables / reports under `/api/v1/…` via `endpoint`.
2. ✅ Existing `lib/server/*` helpers called unchanged; audit added on every
   mutation, events where a consumer would plausibly care (`page.updated`).
3. ✅ Zod schemas on every body; domain validation stays in `lib/server/*`.

Permissions corrected while migrating — these routes asked for permissions that
did not match what they do:

| Route | Was | Now |
| ----- | --- | --- |
| `GET /api/tables` | `pages.view` | `tables.view` |
| `GET /api/tables/metadata` | `pages.view` | `tables.view` |
| `/api/reports` (GET / POST) | `tables.view` / `tables.edit` | `reports.view` / `reports.edit` |
| `/api/reports/[reportId]`, `/execute` | `tables.view` | `reports.view` |
| `/api/reports/generate` | `tables.edit` | `reports.edit` |
| `/api/data/[tableName]/schema` | `data.read` (granted by nothing) | `data.view` |
| `/api/supabase/table`, `/record` | `pages.view` | `data.view` |

Two extractions were needed to keep handlers thin: the mode-aware physical table
listing moved to `lib/server/tables/list-physical.ts`, and the ~400-line table
sync moved from a route body to `lib/server/tables/sync.ts` as
`syncTablesForTenant(tenant)` — callable from a script or automation, not only
over HTTP.

### Phase 5 — Workspace admin routes ✅ done

1. ✅ `/api/workspace/users|roles|invites` and `/api/workspace-apps/[type]` on
   `endpoint` with real permissions.
2. ✅ Reads require `workspace.view`; mutations require `workspace.users` /
   `workspace.invites` / `workspace.manage`, which only admin holds.

These were the most serious gaps in the codebase, and neither was a migration
task — both were missing checks:

- **`/api/workspace/users` PATCH/DELETE had a `// TODO: Add proper RBAC check`
  and performed none.** Any authenticated member could change any other member's
  role — including promoting themselves to admin — or remove them.
- **`/api/workspace/invites` POST had no check either**, so any member could
  invite a new user *as admin*: escalation without needing to be an admin first.

Invariants a permission check alone cannot express now live in
`server/repositories/workspace-users.ts`:

- the workspace owner cannot be demoted or removed;
- the last admin cannot be demoted or removed;
- a role must exist in *this* workspace before it can be assigned or invited to
  (`roles` is workspace-scoped, so an id valid elsewhere is not valid here).

**Streaming routes stay out of `endpoint()`** per the Decisions table:
`/api/chat`, `/api/chat/[id]/stream`, and `/api/reports/generate` (SSE) keep
their own response handling and got auth + permission fixes only.

### Phase 6 — Automations-ready (emit side only)

Do **not** build the full runner yet. Ensure:

1. Document how a future runner drains `event_outbox` (or listens to inserts).
2. Optional: emit a first **domain** event from a known mutation (e.g. after row create when table is tagged) — only if a concrete use case exists.
3. Wire Trigger block execute to an **action** helper that goes through the same permissioned path (replace stub) — even a single “HTTP webhook” or “update row” action proves the pattern.

**Exit:** Events exist in the DB; trigger button does one real action.

### Phase 7 — Agent alignment (later)

1. Splx AI tools that mutate system objects must call the same repos or `/api/v1` (not a parallel write path).
2. Optional: replace `ToolLoopAgent` with Eve as runtime — **out of scope** for Phases 1–6; requires auth adapter (Supabase session → Eve) and streaming design.

---



## Out of scope (for this roadmap’s coding phases)

- Full automation builder UI + workflow runner product
- Email/notification templates as first-class entities (track as follow-on once events exist)
- Draft → review → publish / config diff PR UX
- Replacing Splx chat with Agent C / Eve
- Porting creator/mentorship permission machinery from the other codebase
- Exposing raw Postgres functions/triggers as editable UI (model as actions + events first)

---



## Org-OS follow-ons (after control plane)

Ordered for when someone picks up the larger vision:

1. Action catalog (update row, HTTP, send email by template id)
2. Event catalog (typed names + payloads)
3. Emit from data repo / triggers / inbound webhook
4. Automations CRUD (durable JSON/graph)
5. Runner consuming outbox / webhooks
6. Email templates as entities + visual editor
7. Draft/publish for automations (+ run history, dry-run)
8. Agent tools → same automation/template APIs

The control plane (this doc) is the prerequisite for steps 3–8.

---



## Risks and invariants

1. **RLS bypass on** `/api/data` remains until deliberately redesigned; do not claim
   “RLS protects all API writes.” Writes are now parameterised, column-validated, and
   audited, and scoped by `workspace_id` where that column exists — but they still run
   on a privileged connection that RLS does not constrain.
2. ~~**Dual permission sources**~~ → **partly resolved.** `role_permissions` is the
   runtime source of truth for the control plane (`server/permissions/check.ts` reads
   it, cached 60s, static map as fallback), and the legacy synchronous
   `requireCapability` now shares the same definitions and matcher. What remains: the
   static map must be kept in sync with the migration's seed by hand, and
   `role_permissions` is global while `roles` is workspace-scoped.
3. ~~**Middleware redirects** unauthenticated `/api/*` to HTML signin~~ → **fixed.**
   `proxy.ts` returns JSON 401 for API paths and skips the onboarding redirect there.
4. **Chat streaming** must not be forced into `{ data, meta }` responses. Still true —
   `endpoint()` is for JSON routes only; the chat route is untouched.
5. **Agent must not bypass** the control plane when writing system objects — otherwise
   audit/events lie. Still true: `lib/ai/tools/query-user-table.ts` reads through
   `lib/server/data/query`, and no AI tool writes rows yet. Any tool that gains a write
   path must go through `server/repositories/data.ts`.
6. **Local mode is not a security boundary.** The default-workspace bootstrap grants
   admin to whoever signs in first, and physical user tables have no `workspace_id`
   column to scope by.

---



## Pickup checklist

Phases 1–5 are done:

- [x] Phase 1: `server/api` + permissions
- [x] Phase 2: migration for `audit_logs` + `event_outbox`
- [x] Phase 3: data CRUD through the control plane
- [x] Phase 4: pages / tables / reports mutations
- [x] Phase 5: workspace admin routes, including the two missing-authorization bugs
- [x] Keep [RBAC_SYSTEM.md](./RBAC_SYSTEM.md) and
      [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) in sync

Picking up Phase 6 onwards:

- [ ] Re-read this doc, its [Deviations](#deviations-from-this-plan) section, and
      [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)
- [ ] Run `pnpm test:unit` first — it should be green before you start
- [ ] Phase 6: document/build the `event_outbox` drain; wire the Trigger block's
      execute stub (`useTriggerBlockAction`) to a real permissioned action
- [ ] Phase 7: make AI tools that mutate go through `server/repositories/*`
- [ ] Migrate saved page-block configs off `/api/data/` so the delegators can go
- [ ] Parameterise `lib/server/tables/query-builder.ts`
- [ ] Move `/api/supabase/table|record` to `endpoint()`

---

## Verifying changes

`pnpm test:unit` runs the unit tests with no external dependencies. The
integration tests in `server/repositories/data.integration.test.ts` are skipped
unless a database is provided, and they are the ones that prove the SQL, the
tenant predicate, and the audit/outbox writes actually behave against Postgres:

```bash
# 1. A Postgres to test against (any 16.x; no Supabase CLI needed)
initdb -D /var/lib/postgresql/splxdata -U postgres --auth=trust
pg_ctl -D /var/lib/postgresql/splxdata -o '-p 55432' start

# 2. Supabase scaffolding the migrations expect. The migrations reference
#    auth.uid(), auth.role(), auth.jwt(), auth.users, and the anon /
#    authenticated / service_role / authenticator roles. Stub them, with the
#    session-local settings test.user_id and test.auth_role driving auth.uid()
#    and auth.role() so you can impersonate.

# 3. Apply migrations in filename order.
for f in supabase/migrations/*.sql; do
  psql -p 55432 -U postgres -v ON_ERROR_STOP=1 -f "$f"
done
# Note: 20251111000400_onboarding_rbac.sql is not re-runnable — it drops the
# `role` column it reads. That is expected on a second pass, not a failure.

# 4. Seed a workspace, its roles, a membership, and two tables — `contacts`
#    (with a workspace_id column) and `widgets` (without), so both the
#    tenant-predicate and no-predicate paths are covered.

# 5. Run them.
TEST_POSTGRES_URL=postgres://postgres@localhost:55432/postgres pnpm test:unit
```

What the integration tests establish, against a real database:

- a create stamps `workspace_id`, writes one `audit_logs` row and one
  `event_outbox` row with `db.contacts.created` and `processed_at IS NULL`;
- the injection payload `{"notes": ["1); DROP TABLE contacts; --"]}` is stored as
  data and the table survives;
- unknown columns and a caller-supplied `workspace_id` are both rejected;
- update and delete against another workspace's row are no-ops;
- delete of a nonexistent id reports false (the old route reported success);
- a table with no `workspace_id` column still works, with no predicate;
- list returns only this workspace's rows.

For the SQL side, `effective_role_permissions()` can be checked directly:

```sql
-- Workspace A overrides `builder` and defines a custom role `auditor`.
INSERT INTO role_permissions (workspace_id, role_id, permission) VALUES
  ('<ws-a>','builder','pages.view'),
  ('<ws-a>','auditor','data.view');

SELECT * FROM effective_role_permissions('<ws-a>','builder');  -- pages.view only
SELECT * FROM effective_role_permissions('<ws-b>','builder');  -- the 13 globals
SELECT * FROM effective_role_permissions('<ws-a>','auditor');  -- data.view
SELECT * FROM effective_role_permissions('<ws-b>','auditor');  -- empty
```

The same four cases are asserted in `server/permissions/effective.test.ts`. If
they ever disagree, the API and RLS disagree about what a role can do.

---



## Deviations from this plan

Three decisions were changed during implementation. Recorded here so the original
"locked" table above is not read as still-current.

### 1. Dot notation, not `resource:action:scope`

The Decisions table locked in `resource:action:scope`. That was not adopted.

The `role_permissions` table (seeded by `20251215200000_resource_permissions.sql`)
uses `resource.action`, and the SQL helpers the 44 RLS policies call —
`user_has_access`, `user_at_least` — parse that format, including `resource.*`
wildcard expansion via `split_part(p_permission, '.', 1)`. Introducing a colon form
in TypeScript would have made SQL, RLS, and the control plane three dialects of the
same idea, with no migration path between them.

`server/permissions/definitions.ts` therefore uses dot notation, and
`server/permissions/match.ts` implements the same wildcard semantics as the SQL
helper. The `:scope` suffix was dropped entirely — every permission today is
workspace-scoped, so it encoded no information.

### 2. `/api/data` had a live SQL injection

The Risks section said RLS bypass on `/api/data` "remains until deliberately
redesigned" and the Decisions table framed the controls as "capability + validation +
audit". The actual state was worse and could not be deferred:

```ts
// old app/api/data/[tableName]/route.ts, POST
else values.push(String(value));            // L175
// ...and PATCH
else updates.push(`${escapedKey} = ${value}`);   // L251
```

Only strings and nulls were escaped. Any non-string, non-null JSON value was
interpolated raw into a `sql.raw()` statement, so a body of
`{"qty": ["1); DROP TABLE contacts; --"]}` was injected verbatim — executing as the
privileged `POSTGRES_URL` role, reachable by any member with `data.create` (which
includes the `user` role).

Two related defects were fixed at the same time:

- **Arbitrary column writes.** The table config was fetched purely as a 404 gate and
  its columns were never consulted, so a caller could write `workspace_id`, `id`, or
  any column the UI never exposed.
- **No tenant predicate on writes.** `PATCH`/`DELETE` emitted `WHERE <pk> = <id>` with
  nothing else. In local mode every workspace shares one physical database, so a
  member of workspace A could update or delete workspace B's rows by id.

`server/repositories/data.ts` binds every value as a parameter and interpolates
identifiers only after matching them against `information_schema.columns`.

### 3. Tenant scoping is opportunistic, and local mode is not a security boundary

The plan assumed a workspace predicate could simply be added. It cannot be added
universally: **user tables created through Splx have no `workspace_id` column**
(`lib/server/tables/postgres/create-table.ts` does not add one). Only the `tables`
config registry is workspace-scoped.

So the repository adds `AND workspace_id = $ws` **only when the physical table
actually has that column** — free, since it introspects columns anyway. Where the
column does not exist, the workspace boundary is:

- **hosted mode** — the physical connection, which is genuinely per-workspace;
- **local mode** — the config registry only. Two workspaces that register the same
  table name share rows.

Relatedly, `resolveTenantContext` auto-enrolled any authenticated caller as **admin**
of whatever workspace `x-workspace-id` named — and `proxy.ts` forwards that request
header verbatim from the client. That let any authenticated user become admin of any
workspace by guessing its UUID. Auto-enrolment is now restricted to the configured
bootstrap workspace; any other requested workspace requires existing membership.

The default-workspace bootstrap in local mode still grants admin to whoever signs in
first, because that is what makes `pnpm dev` work on a fresh checkout. **Do not run
`APP_MODE=local` anywhere that treats its workspaces as a security boundary.**

### 4. Workspace-scoped `role_permissions`

`roles` is workspace-scoped (composite PK `workspace_id, id`) but
`role_permissions` was global, so a workspace defining a custom role got nothing
from either source and was denied everything.

`20260805130000_workspace_scoped_role_permissions.sql` adds a nullable
`workspace_id`: NULL is the global default, non-NULL is that workspace's own
definition. Resolution is **override per role** — if a workspace defines any rows
for a role, those are that role's complete set there; otherwise the globals apply.

Override rather than union so a workspace can *restrict* a built-in role, not only
extend it. The trade-off is real and worth knowing: a workspace that customises
`builder` will not pick up new `builder` permissions added to the global seed later.

The primary key could not include a nullable column, so it is replaced by two
partial unique indexes. Both the SQL helper
(`effective_role_permissions(workspace_id, role_id)`) and the TypeScript resolver
(`server/permissions/match.ts`) implement the same rule — if they diverge, the API
and RLS disagree about what a role can do, so the same scenarios are asserted in
`server/permissions/effective.test.ts` and against a live Postgres.

### 5. Audit and events write to the *main* database

`audit_logs` and `event_outbox` are created by the Supabase migrations, so they
live in the main database. The first implementation wrote them through the
resource-store connection — correct in local mode, but in **hosted mode the
resource store is a different database per workspace**, where those tables do not
exist, so every audit write would have failed silently (they catch and log).

`server/lib/db.ts` now provides a pooled main-database client, and everything in
`server/lib/*` uses it. It is also a module-level pool rather than one opened and
closed per call, which is a step toward the connection churn noted below.

### Not addressed

Found during this work, deliberately left for a follow-up:

- `lib/server/tables/query-builder.ts` still builds `WHERE` clauses by string
  concatenation with the same `typeof v === "string" ? escapeString(v) : String(v)`
  pattern. The v1 read path is safe because filter keys are validated against real
  columns and filter values arrive from `URLSearchParams` as strings, but the helper
  itself should be parameterised.
- `resolveTenantContext` opens and closes a fresh `postgres()` pool on every call; a
  single API request opens three or more counting middleware. `server/lib/db.ts`
  shows the shape the fix should take.
- The SSRF guard (`server/lib/safe-url.ts`) resolves the hostname and rejects
  non-public addresses, but does not close the DNS-rebinding window — the address
  could change between the lookup and `fetch`'s own. Closing it needs an agent that
  pins the resolved address.
- `/api/supabase/table` and `/api/supabase/record` had their permissions corrected
  but were not moved to `endpoint()`; they have bespoke response shapes and are
  read-only.
- The static fallback map in `definitions.ts` must be kept in sync with the
  migration's seed by hand.
- `pnpm lint` is broken independently of this work: `biome.jsonc` has
  `extends: ["ultracite"]`, but ultracite 6 exports `ultracite/core`, `ultracite/next`,
  … so the config does not resolve. It fails on a clean tree.

---

## Reference: pattern source

Internal APIs on a sibling CodeBase-style project use thin Next route handlers wrapped by `endpoint()` (`server/api/endpoint.ts`), hybrid repos + direct Supabase, centralized `emitEvent` / `writeAuditLog`, and a stub `logRequest`. Splx should adopt that **shape** without its domain-specific role-loading branches inside the wrapper.
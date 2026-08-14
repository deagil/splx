# Splx — Work Backlog

> Ticket-ready work items derived from [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).
> IDs are stable — quote `SPX-nnn` in branches, commits and tickets.
>
> **Detail is deliberately uneven.** Phase 0 and Phase 1 are specified to
> ticket level because they are next. Phases 2–7 stay at epic level, because
> specifying work three months out produces detail that is wrong by the time it
> is read. Epics are broken down when they reach the top of the queue.
>
> Sizes: **S** ≈ 1–3 days · **M** ≈ 1–2 weeks · **L** ≈ 3–6 weeks.
> One experienced person working with AI assistance.

---

## Status

| Phase | Theme | Items | Status |
| --- | --- | --- | --- |
| 0 | Stop silent failures | SPX-001…008 | **Not started** |
| 1 | Forms + HTTP CRUD | SPX-101…109 | Blocked by Phase 0 |
| 2 | Config lifecycle | SPX-200 (epic) | Not started |
| 3 | Durable execution | SPX-300 (epic) | Not started |
| 4 | Authz depth + operator | SPX-400 (epic) | Blocked by Phase 1 |
| 5 | AI parity | SPX-500 (epic) | Blocked by Phase 1 |
| 6 | Tier 1 (ledger) | SPX-600 (epic) | Deferred until a vertical needs it |
| 7 | Scale and ops | SPX-700 (epic) | Continuous |

---

## Dependency graph

```
SPX-001 ─┬─► SPX-002
         │
SPX-003 ─┴─► ALL OF PHASE 1
SPX-004 ──►
SPX-005 (independent, security — do early)
SPX-006 (independent)
SPX-007 ─► SPX-008

SPX-101 ─► SPX-102 ─┬─► SPX-103 ─► SPX-107 ─► SPX-106
                    ├─► SPX-104
                    ├─► SPX-105
                    ├─► SPX-109
                    └─► SPX-108
```

---

# Phase 0 — Stop the silent failures

**Goal:** no code path loses or duplicates work without surfacing it.
**Why first:** every later phase inherits these defects, and each additional
feature makes them harder to fix.

---

### SPX-001 · Step-level workflow checkpointing

**Phase** 0 · **Size** M · **Blocks** SPX-002, all of Phase 1
**Traces** D-1 (critical), R-13

**Problem.** `server/workflows/worker.ts:173` iterates `steps.entries()` from
index 0 on every attempt. `handleFailure` (298–325) returns the schedule row to
`pending`, and `runContext.steps` is rebuilt empty at 156–159. Nothing records
which steps already ran.

A three-step workflow — (1) create a payment row, (2) POST to a payment rail,
(3) send confirmation — that times out at step 2 re-executes step 1 on retry,
creating a duplicate payment record and firing a second rail request. Up to
`MAX_SCHEDULE_ATTEMPTS` times.

**Approach.**
- Add `completed_steps jsonb NOT NULL DEFAULT '[]'` to `workflow_schedule`.
- After each successful step, persist its index and output before moving on.
- On claim, rehydrate `runContext.steps` from `completed_steps` and start the
  loop at the first incomplete index.
- Decide and document whether a retry produces a new `workflow_runs` row linked
  to the schedule, or continues the existing one. Prefer a new row with an
  `attempt` column — the run history should show what actually happened.

**Acceptance criteria.**
- [ ] A 3-step workflow whose step 2 fails on attempt 1 and succeeds on attempt 2
      executes step 1's action **exactly once** (integration test).
- [ ] `{{steps.0.output.x}}` resolves correctly on the resumed attempt.
- [ ] Existing `pending` rows with no `completed_steps` start from index 0
      (migration is backward compatible).
- [ ] Run history makes it possible to see, for one schedule, which steps ran on
      which attempt.

**Touches.** `server/workflows/worker.ts`, `lib/db/schema.ts`,
`supabase/migrations/`, `server/workflows/workflows.integration.test.ts`

**Risks.** Step outputs may be large; consider a size cap on persisted output.
Non-idempotent actions still double-fire *within* a single step — SPX-002.

---

### SPX-002 · Idempotency keys on external effects

**Phase** 0 · **Size** S · **Blocked by** SPX-001
**Traces** D-1, R-13

**Problem.** `server/workflows/actions/http.ts` has no idempotency mechanism. If
a request is sent and the response is lost, the retry is indistinguishable from a
new request to the receiver. Same for `send_email`.

**Approach.**
- Add optional `idempotencyKey` to the `http` action schema.
- Default it deterministically from `(runId, stepIndex)` so it is stable across
  retries of the same logical step but differs between steps and runs.
- Send as `Idempotency-Key` header (configurable header name — not every vendor
  uses that spelling).
- Same for `send_email`, passed to the provider where supported.

**Acceptance criteria.**
- [ ] The same logical step retried sends an identical idempotency key.
- [ ] Two different steps in one run send different keys.
- [ ] Header name is configurable per step.
- [ ] Documented in `docs/WORKFLOWS.md` action table.

**Touches.** `server/workflows/actions/http.ts`,
`server/workflows/actions/send-email.ts`, `docs/WORKFLOWS.md`

---

### SPX-003 · Transactional outbox for events

**Phase** 0 · **Size** M · **Blocks** all of Phase 1
**Traces** D-2 (critical), R-13

**Problem.** `server/lib/events.ts:36–124` opens its own transaction on the
**control-plane** database. In hosted mode the mutation that triggered it was
written to the **resource store** — a different database. There is no
cross-database transaction. The whole function is wrapped in a `try/catch` that
logs and swallows (117–123).

So: row commits → `emitEvent` fails → nothing retried, nothing surfaced → the
workflow never runs. `docs/WORKFLOWS.md:29` documents this as intentional. That
reasoning holds for analytics events and fails for a payment instruction.

**Approach.**
- Create `event_outbox` **in the resource store** (same database as the data).
- `dataRepository` writes the mutation and the outbox row in **one explicit
  transaction**. Note: the repository currently issues a single statement per
  operation and relies on implicit transactionality — adding a second write means
  introducing an explicit transaction wrapper in `withStore`.
- A relay claims unsent outbox rows (`FOR UPDATE SKIP LOCKED`, same pattern as
  the workflow worker), calls the existing `emitEvent` fan-out against the
  control plane, and marks them sent.
- Delivery is at-least-once; dedupe on the outbox row id in `event_logs`.
- Local mode uses the identical path (same database, still an outbox).

**Acceptance criteria.**
- [ ] Row create with the control plane unreachable → row commits, and the event
      is delivered once the control plane recovers (integration test).
- [ ] A mutation that fails rolls back its outbox row.
- [ ] Two concurrent relays do not double-deliver.
- [ ] `emitEvent`'s signature is unchanged for non-data callers (workflow
      lifecycle events still emit directly).

**Touches.** `server/repositories/data.ts`, `server/lib/events.ts`,
new `server/lib/outbox-relay.ts`, `supabase/migrations/`,
`docs/WORKFLOWS.md`, `docs/DATABASE_ARCHITECTURE.md`

**Risks.** The relay needs somewhere to run — reuse the workflow tick route.
Resource-store schema is tenant-owned; adding a table there needs a
provisioning path for existing tenants.

---

### SPX-004 · Surface event emission failures

**Phase** 0 · **Size** S · **Traces** D-2, R-15

**Problem.** `events.ts:117–123` catches everything and writes one console line.
In production that is invisible.

**Approach.**
- Keep the "must not fail the originating mutation" property.
- On failure, increment a counter and write to a visible failure record
  (reuse the outbox row's `error`/`attempts` from SPX-003 where applicable).
- Expose in the dead-letter surface (SPX-300) — for now, a queryable table and a
  structured log line with `requestId`.

**Acceptance criteria.**
- [ ] A forced emit failure produces a durable, queryable record — not only a log.
- [ ] The originating mutation still succeeds.
- [ ] Failure record carries `requestId`, `eventName`, `workspaceId`, error.

**Touches.** `server/lib/events.ts`, `supabase/migrations/`

---

### SPX-005 · Report query lockdown

**Phase** 0 · **Size** M · **Independent — schedule early**
**Traces** D-3 (high, security)

**Problem.** `lib/server/reports/run-query.ts`:

- `assertSafeSelect` (12–23) is a substring blocklist on lowercased text, keyed
  on `keyword + " "`. Tabs, newlines, comments and parentheses defeat it
  (`delete\tfrom`, `delete/**/from`). It also false-positives on legitimate
  queries containing those words in literals.
- The result is passed to `sql.raw` (34).
- **There is no workspace scoping at all.** In local mode the resource store is
  the same database as the control plane, so `reports.edit` can read `users`,
  `workspace_users`, and other workspaces' rows in any shared table.

**Approach.** Preferred, in order:
1. Run report queries through a dedicated Postgres role with `SELECT`-only grants
   limited to tenant-visible relations, and force a workspace predicate.
2. If (1) is slow to land, ship the interim first: gate report execution behind
   `workspace.admin` and record the decision inline, then do (1).
3. Longer term (see Q-3): replace raw SQL with a query builder over registered
   Entities, keeping raw SQL as an admin-only escape hatch.

**Acceptance criteria.**
- [ ] A report cannot read another workspace's rows in local mode (test).
- [ ] A report cannot read `users` / `workspace_users` (test).
- [ ] Bypass attempts using tabs, comments and newlines are covered by tests.
- [ ] A legitimate query containing the word "update" in a string literal is not
      rejected.

**Touches.** `lib/server/reports/run-query.ts`, `app/api/v1/reports/execute/`,
`supabase/migrations/` (role and grants), new tests

**Risks.** Role-based approach interacts with Supabase's role model and with
hosted mode's per-tenant connections; confirm the approach works in both before
committing. This is the item most likely to need a spike first.

---

### SPX-006 · Resource store connection resolution

**Phase** 0 · **Size** S · **Independent** · **Traces** D-5

**Problem.** `resolveWorkspaceConnection` in
`lib/server/tenant/resource-store.ts:125–137` selects the **oldest**
`workspace_apps` row for the workspace with **no filter on `type`**.
`workspace_apps` also holds OpenAI connections. A workspace that connected
OpenAI before Postgres resolves its *data store* to the OpenAI row, and
`createAdapterForConnection` (146–166) throws `Unsupported connection type`.

**Approach.**
- Filter to connection types that can back a resource store.
- Add an explicit `is_primary_store boolean` rather than relying on creation
  order; backfill for existing workspaces.
- Fail with a clear error naming the workspace when no primary store exists.

**Acceptance criteria.**
- [ ] A workspace with an OpenAI connection created first still resolves its
      Postgres store.
- [ ] Exactly one primary store per workspace is enforceable.
- [ ] Missing-store error names the workspace and the fix.

**Touches.** `lib/server/tenant/resource-store.ts`, `lib/db/schema.ts`,
`supabase/migrations/`

---

### SPX-007 · Fail closed on permission load failure

**Phase** 0 · **Size** S · **Blocks** SPX-008 · **Traces** D-6

**Problem.** `server/permissions/check.ts:69–75` catches **any** error loading
`role_permissions` and falls back to `DEFAULT_ROLE_PERMISSIONS`. A transient
database error silently substitutes a different permission set instead of
denying. Two distinct failure modes (empty table at 62–64, exception at 69–75)
both silently grant.

**Approach.**
- Distinguish "schema not migrated" (an explicit probe — table absent) from "load
  failed" (anything else).
- Not-migrated → static map, with a loud warning. Load failed → deny.
- Keep the cache, but never cache a failure result.

**Acceptance criteria.**
- [ ] Simulated DB error during permission load → request denied, not granted.
- [ ] Fresh checkout before `pnpm db:migrate` still works (static fallback).
- [ ] Both paths log distinguishably.

**Touches.** `server/permissions/check.ts`, `server/permissions/check` tests

---

### SPX-008 · Workspace-scoped role permissions

**Phase** 0 · **Size** M · **Blocked by** SPX-007 · **Traces** D-7

**Problem.** Documented at `server/permissions/definitions.ts:78–82`: `roles` is
workspace-scoped (composite PK `workspace_id, id`) while `role_permissions` is
global. A workspace that defines a custom role gets permissions from neither
source and is denied everything. Custom roles are table stakes for a
multi-tenant product.

**Approach.**
- Make `role_permissions` workspace-scoped, or add a workspace-scoped override
  table with a documented resolution order (workspace grant > global default).
- `resolveEffectivePermissions` in `server/permissions/match.ts` already models
  overrides — extend rather than replace.
- Migration must preserve current effective permissions for every existing
  workspace.

**Acceptance criteria.**
- [ ] A workspace-defined custom role resolves to its granted permissions.
- [ ] Existing workspaces' effective permissions are unchanged post-migration
      (test comparing before/after for each seeded role).
- [ ] Resolution order documented in `docs/RBAC_SYSTEM.md`.

**Touches.** `server/permissions/definitions.ts`, `server/permissions/match.ts`,
`server/permissions/check.ts`, `supabase/migrations/`, `docs/RBAC_SYSTEM.md`

---

### SPX-009 · `workspace_id` on user-created tables

**Phase** 0 · **Size** M · **Gated on** Q-5 · **Traces** P-2, D-3

**Problem.** `lib/server/tables/postgres/create-table.ts` builds columns purely
from user field definitions and never adds `workspace_id`. So user tables have no
tenant column at all, and `server/repositories/data.ts` scopes by workspace only
"when the column happens to exist" — which for user tables it never does.

In a shared database, two workspaces registering a table with the same name share
its rows. This is not a query bug; it is a single-tenancy assumption baked into
table creation, and it is what makes `APP_MODE=local` unsafe with more than one
workspace.

**Approach.**
- Add `workspace_id` to every table created through Splx, always, in both
  deployment shapes.
- Backfill existing user tables; for tables with rows from more than one
  workspace, this needs a documented manual reconciliation — flag rather than
  guess.
- Make workspace scoping unconditional in `dataRepository` rather than
  conditional on column presence.
- Add a check that refuses to serve a registered table lacking the column.

**Acceptance criteria.**
- [ ] A newly created user table has `workspace_id`, not null.
- [ ] Two workspaces registering the same table name do not see each other's rows
      in a single-database deployment (test).
- [ ] `dataRepository` scoping is unconditional; a table without the column is
      refused, not silently unscoped.
- [ ] Backfill migration reports tables it cannot safely attribute.

**Touches.** `lib/server/tables/postgres/create-table.ts`,
`server/repositories/data.ts`, `lib/server/tables/sync.ts`,
`supabase/migrations/`

**Risks.** Existing local-mode data may genuinely be ambiguous. Decide Q-5 first
— if local is dev-only, the backfill can be destructive; if it is a supported
deployment, it cannot.

---

## Phase 0 exit criteria

- [ ] Integration test: a workflow whose step 2 fails does not re-execute step 1.
- [ ] Integration test: an event survives a control-plane outage during a
      resource-store write.
- [ ] Integration test: a report cannot read another workspace's rows.
- [ ] No authorisation path grants on error.

---

# Phase 1 — Forms and HTTP CRUD

**Goal:** R-17 / R-17b / R-18 — Forms as data definitions, CRUD as HTTP through
a Form, workflows as process definitions invoked with POST.

**Do not start before Phase 0 lands.** Forms and sync workflow invoke built on
an engine that duplicates side effects inherit the defect at a higher altitude.

**Settled before this phase:** Q-1 (`form`), Q-2 (blocks bind to a form; CRUD is
HTTP; processes are workflows). **Still open:** Q-7 (first vertical). See
DEVELOPMENT_PLAN §12.

---

### SPX-101 · `entities` and `forms` schema

**Phase** 1 · **Size** M · **Blocks** everything in Phase 1
**Traces** R-17, R-18, R-2, R-22

**Scope.** Two control-plane tables, Zod schemas, repository with audit and
events. Fields typed — no `Record<string, unknown>`. No `operation` column:
create vs update is HTTP method through the same form.

Carries from day one (thesis §5, rule 4 of the plan): `version`, `origin`,
`origin_ref`, `origin_rev`, `locally_modified`, and **ids stable and independent
of display names** so later renames are tractable.

**Acceptance criteria.**
- [ ] `fields` has a discriminated, typed schema per field type.
- [ ] Form ids are namespaced and stable; renaming a display name does not
      change identity.
- [ ] Publishing a form creates an immutable version; editing creates a draft.
- [ ] `entities` wraps existing table config rather than duplicating it.
- [ ] A form declares `methods` (GET/POST/PATCH/DELETE), not a single operation.

**Touches.** `lib/db/schema.ts`, new `lib/server/forms/`,
new `server/repositories/forms.ts`, `supabase/migrations/`

---

### SPX-102 · Form apply engine

**Phase** 1 · **Size** L · **Blocked by** SPX-101 · **Traces** R-17, R-7

**Scope.** `applyForm(form, method, input, tenant)` — resolve version, check
permission and allowed method, validate field-by-field, strip unreadable /
unwritable fields, apply computed and read-only, delegate to `dataRepository`,
emit if declared.

`dataRepository`'s `information_schema` allowlist stays as the last line of
defence beneath this. HTTP and workflow write steps both call this function.

**Acceptance criteria.**
- [ ] Validation failures return field-level errors, not a single message.
- [ ] A field absent from the form cannot be written even if the column exists.
- [ ] A method not in `form.methods` is 405.
- [ ] The declared `emits` event fires with the form id and version.
- [ ] Audit entry records the form version applied (R-9).

**Touches.** new `lib/server/forms/apply.ts`, `server/repositories/data.ts`

---

### SPX-103 · Generic entity HTTP routes

**Phase** 1 · **Size** S · **Blocked by** SPX-102 · **Traces** R-17

**Scope.** `GET/POST /api/v1/entities/[entityId]` and
`GET/PATCH/DELETE /api/v1/entities/[entityId]/[recordId]` on `endpoint()`,
with `?form=` selecting the projection. Auth, permission and schema come from
the Form. One resource surface replaces N hand-written routes. Not
`POST /api/v1/c/[contractId]`.

**Acceptance criteria.**
- [ ] Permission and allowed methods come from the Form, not the route.
- [ ] Unknown form → 404; unpublished → 404 for non-builders.
- [ ] Response envelope matches existing `endpoint()` conventions.
- [ ] Create is POST, update is PATCH, read is GET, delete is DELETE.

**Touches.** new `app/api/v1/entities/[entityId]/route.ts`,
`app/api/v1/entities/[entityId]/[recordId]/route.ts`

---

### SPX-104 · Field-level authorisation

**Phase** 1 · **Size** M · **Blocked by** SPX-102 · **Traces** R-7

**Scope.** `visibleTo` / `writableBy` per field, enforced on read projection and
write. This is the item that unblocks the operator persona (Phase 4).

**Acceptance criteria.**
- [ ] A field marked `visibleTo: [role:admin]` is absent from the API response
      for a non-admin — not merely hidden in the UI.
- [ ] Writing a non-writable field is rejected, not silently ignored.
- [ ] List queries do not select restricted columns.

**Touches.** `lib/server/forms/apply.ts`,
`lib/server/tables/query-builder.ts`

---

### SPX-105 · Workflows through Forms, and sync on-demand run

**Phase** 1 · **Size** M · **Blocked by** SPX-102 · **Traces** R-17, R-17b

**Scope.** Two related changes:

1. Write steps apply a form via `applyForm` (same validation as HTTP). `row`
   stays as an admin-only escape hatch, documented as bypassing Forms.
2. `POST /api/v1/workflows/[id]/run` executes **in-request**, synchronously,
   under the caller's permissions. Start payload is typed by a form. Event- and
   timer-triggered starts continue to enqueue `workflow_schedule` rows.

**Acceptance criteria.**
- [ ] Same input rejected identically via HTTP PATCH and via a workflow write
      step applying that form.
- [ ] Step config can enumerate the form's fields (the reuse property).
- [ ] `row` is documented as a bypass and gated.
- [ ] A Trigger-block POST returns the run result in the same request (not
      202 + poll) and is denied if the signed-in user lacks `workflows.run`
      on that workflow.
- [ ] Event-triggered runs still enqueue and still use workspace authority.

**Touches.** `server/workflows/actions/row.ts` or new apply-form action,
`server/workflows/actions/index.ts`, `app/api/v1/workflows/[id]/run/route.ts`,
`docs/WORKFLOWS.md`

---

### SPX-106 · Typed block configuration

**Phase** 1 · **Size** M · **Blocked by** SPX-107 · **Traces** review §3.1

**Scope.** Replace `PageBlockConfig = Record<string, unknown>`
(`lib/db/schema.ts:187`) and the untyped `dataSource`/`displayConfig`
(`lib/server/pages/schema.ts:26–32`) with a discriminated union per block type,
where List and Record blocks reference a **form id**.

**Acceptance criteria.**
- [ ] Invalid block config is rejected at save time with a field-level error.
- [ ] Block config referencing a non-existent form fails validation.
- [ ] Existing pages migrate (SPX-107) without user-visible change.

**Touches.** `lib/db/schema.ts`, `lib/server/pages/schema.ts`,
`components/pages/blocks/*`

---

### SPX-107 · Form generation from existing tables

**Phase** 1 · **Size** M · **Blocked by** SPX-103 · **Blocks** SPX-106

**Scope.** Generate a default Form per existing table (`<table>.default`) from
current `field_metadata`, so existing pages keep working. Dual-read during
transition. Do **not** generate `.create` / `.update` / `.read` clones.

**Acceptance criteria.**
- [ ] Every existing table gets one working default form.
- [ ] Existing pages render unchanged before and after.
- [ ] A documented cutover point after which `field_metadata` is no longer read
      for anything the Form owns.

**Touches.** new migration script, `lib/server/tables/sync.ts`,
`components/pages/blocks/*`

---

### SPX-108 · Form editor UI

**Phase** 1 · **Size** L · **Blocked by** SPX-101 · **Traces** R-26

**Scope.** Field list, type, validation, visibility, allowed HTTP methods. The
visual surface the thesis promises, and the thing a non-coder reviews.

**Acceptance criteria.**
- [ ] A non-developer can add a validated, permissioned field without help.
- [ ] Editing produces a draft; publishing creates a version.
- [ ] The diff between two versions is rendered legibly.

**Touches.** new `components/forms/`, new `app/(app)/build/forms/`

---

### SPX-109 · Computed fields

**Phase** 1 · **Size** M · **Blocked by** SPX-102 · **Traces** R-35, C-13

**Scope.** `source: "computed:<expr>"` evaluated by the engine so a derived value
is identical in UI, API and workflow contexts. Pure expressions only, no side
effects.

**Acceptance criteria.**
- [ ] The same computed field returns the same value via UI, API and workflow.
- [ ] Expressions cannot perform I/O or mutate state.
- [ ] Evaluation errors surface as field-level errors, not 500s.

**Touches.** `lib/server/forms/apply.ts`, new expression evaluator

---

## Phase 1 exit criteria

- [ ] A page block and an HTTP call write the same record through the same
      Form, and reject the same invalid input identically.
- [ ] A workflow write step applying that Form is identical to the HTTP path.
- [ ] `POST /api/v1/workflows/[id]/run` returns the run result in-request, as
      the signed-in user.
- [ ] `visibleTo: [role:admin]` hides a field in the UI **and** strips it from
      the API response.
- [ ] `field_metadata` is no longer read for anything the Form owns.

---

# Phases 2–7 — Epics

Broken down when they reach the top of the queue.

### SPX-200 · Config lifecycle (Phase 2) — **L**
Versioning for all executable config, provenance columns, deterministic export,
import with dry-run, blueprint packaging and install, three-way merge upgrade,
environments, fleet view.
**Traces** R-2, R-9, R-14, R-21…R-25, R-37, R-38, D-4.
**Business significance:** this is the phase that converts per-client work into
product leverage. See [DELIVERY_LIFECYCLE.md](./DELIVERY_LIFECYCLE.md) Loop D.

### SPX-201 · Telemetry capture (Phase 2) — **M** · **time-sensitive**
A third data plane for derived, scrubbed signal: config edit traces, AI
proposal → human correction pairs, run outcomes, validation failures.

**Build the capture alongside Phase 2 provenance, before Phase 5 ships**, even if
nothing analyses it for a year. Proposal/correction pairs cannot be collected
retroactively — if the AI authoring path ships without capture, that signal is
gone permanently. It is also the corpus that evals need, which is a nearer-term
need than fine-tuning.

**Traces** P-3. See [DATA_PLACEMENT.md §6](./DATA_PLACEMENT.md).

### SPX-300 · Durable execution and scheduling (Phase 3) — **M–L**
Time-based triggers, version pinning at enqueue, compensation, wait and approval
steps, dead-letter surface, worker tier separation, per-tenant concurrency,
record timers, state machines.
**Traces** R-2, R-8, R-15, R-28, R-30, R-31, R-32, D-4, D-10.

### SPX-400 · Authorisation depth and operator persona (Phase 4) — **L**
Record-scoped grants, action permissions, maker-checker, Case primitive,
operator mode, work-centric home.
**Traces** R-4, R-7, R-8, R-26, R-27. **Blocked by** Phase 1.

### SPX-500 · AI parity (Phase 5) — **M**
Read tools, write tools, propose-and-review drafts, explain mode.
**Traces** R-1, R-2, R-3. **Blocked by** Phase 1.
**Deliberately late** — tools written before Forms would target raw tables
and become a permanent bypass around the abstraction meant to govern them.

### SPX-600 · Tier 1 (Phase 6) — **L per mechanism**
Slot reservation, stock reservation, or ledger posting — build only what the
first vertical demands.
**Traces** R-5, R-20. **Deferred by design.**

### SPX-700 · Scale and operations (Phase 7) — **continuous**
Per-tenant pooled connections (D-8), complete the v1 migration and delete the
legacy surface (D-9), connector primitive, bulk import/export, observability,
test coverage (D-11).
**Traces** R-12, R-15, R-16, R-29.

### SPX-701 · Collapse `local`/`hosted` into a deployment setting (Phase 7) — **M**
One logical model always (control plane + tenant plane); `APP_MODE` describes
only where those planes physically live and changes **no** semantics. Removes the
~10 files that branch on mode and the class of defect where local mode has weaker
isolation than hosted.

**Blocked by** SPX-009 (the `workspace_id` fix is what makes a shared-database
deployment safe in the first place). **Gated on** Q-5.
**Traces** P-5. See [DATA_PLACEMENT.md §7](./DATA_PLACEMENT.md).

### SPX-800 · Capability backlog — **pulled by vertical**
Document rendering (R-33), sequences (R-34), consent and channel preferences
(R-36), file storage (C-11). Each small; each pulled in by the first vertical
that needs it. **Sequences before the first invoice ships** — retrofitting
gapless numbering is painful.

---

# Suggested first sprint

A starting proposal to react to, not a commitment.

| Item | Size | Rationale |
| --- | --- | --- |
| SPX-005 | M | Only live cross-tenant read. Security first. |
| SPX-001 | M | Highest-severity correctness defect; self-contained. |
| SPX-006 | S | Small, independent, removes a hosted-mode footgun. |
| SPX-007 | S | Small, independent, removes a fail-open path. |

**Also this sprint, not code:** decide Q-7 (first vertical). Q-1 and Q-2 are
settled (form as data definition; pages bind to a form; CRUD is HTTP;
processes are workflows). They already shape SPX-101.

SPX-003 (transactional outbox) is the other Phase 0 must-have but is the largest
and touches tenant schema provisioning — worth a short spike before committing it
to a sprint.

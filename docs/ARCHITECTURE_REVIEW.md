# Splx — Architecture Review

> **Status:** assessment of the implementation as of commit `ccc285d`
> (2026-08-09), against the target described in
> [SYSTEM_THESIS.md](./SYSTEM_THESIS.md).
>
> On 2026-08-14 the target for R-17 was revised: a Form is a field projection
> (data definition); CRUD is HTTP; processes are workflows invoked with POST.
> Earlier drafts fused those into an RPC Contract. The **gap** in this review
> is unchanged — neither object exists in the code — only the name and HTTP
> shape of the intended fix.
>
> Every claim cites a file and, where useful, a line. This document is
> deliberately blunt; it is an engineering assessment, not a status report.

---

## 1. Verdict

**The foundation is better than the abstraction.**

The control plane — request handling, audit, event fan-out, workflow scheduling,
SQL safety — is thoughtfully built and in several places better than commercial
products in this category. The comments in `server/repositories/data.ts` show
someone who found three real vulnerabilities and fixed them structurally rather
than patching symptoms. That is a good sign about how this codebase gets built.

The problem is one level up. **The Form object (R-17) — a named field
projection used by UI, HTTP CRUD, and workflow steps — does not exist.** In its
absence, splx is table-centric: page blocks, API routes, workflow actions, and
the AI each know about tables independently, and each is a separate opportunity
to drift. Field metadata that looks like it should be authoritative is
decorative.

This is additive to fix, not a rewrite. The layer underneath the missing
abstraction is the expensive part, and it is largely done.

| Area | Grade | One-line summary |
| --- | --- | --- |
| API control plane | **Strong** | `endpoint()` is the right shape; migration incomplete |
| Data access safety | **Strong** | Parameterised, allowlisted identifiers, audited |
| Workflow scheduling | **Good** | Correct table split, correct claiming; not durable-execution grade |
| Multi-tenant isolation | **Mixed** | Real per-tenant DBs; connection resolution has a defect |
| RBAC | **Weak** | Coarse global verbs; custom roles broken; fails open |
| Form / config model | **Absent** | The core thesis is not implemented |
| Config lifecycle | **Absent** | No versioning, provenance, export, or blueprints |
| Tier 1 (ledger) | **Absent** | No reservation or ledger primitive |
| AI parity (R-3) | **Not started** | `agent/tools/` is empty |
| Test coverage | **Thin** | Good where it exists; large untested surface |

---

## 2. What is genuinely strong

### 2.1 `endpoint()` — the API control plane

`server/api/endpoint.ts` wraps auth, permission check, body validation, response
envelope, error mapping, and structured logging with a `requestId` that threads
into `audit_logs` and `event_logs`. Handlers stay orchestration-only, and
`CLAUDE.md` correctly instructs that mutations live in repositories so non-HTTP
callers get audit and events too.

This is the right design. It is also the natural place for Forms to plug in
later — a Form-driven route is `endpoint()` with its config derived from data
rather than written inline. CRUD is HTTP on the entity (`?form=`); processes
are `POST /workflows/:id/run`.

### 2.2 Data access

`server/repositories/data.ts` is the strongest file in the codebase:

- Every value is a bound parameter; only identifiers are interpolated, and only
  after matching against `information_schema` (`resolveTable`, lines 122–187).
- `validateWriteKeys` (195–216) rejects unknown columns and refuses
  caller-supplied `workspace_id` — closing a cross-tenant write on shared
  physical tables.
- Audit entry and technical event on every mutation (399–416, 517–534, 557–574).
- SQL builders kept pure (`buildInsert`/`buildUpdate`/`buildDelete`) so injection
  behaviour is unit-testable without a database — and it is tested
  (`server/repositories/data.test.ts`).

### 2.3 The workflow table split

`docs/WORKFLOWS.md` §Concepts gets right what most implementations get wrong:

- `event_logs` — immutable facts
- `workflow_schedule` — mutable queue
- `workflow_runs` — executions

Collapsing these is the standard mistake, and the doc explicitly explains why
they must stay separate. Claiming uses `FOR UPDATE SKIP LOCKED` with a lease
cutoff (`server/workflows/worker.ts:80–106`), which is correct and concurrency-safe.

### 2.4 Defensive details

- SSRF guard with **per-hop** redirect re-validation and capped response bodies
  (`server/workflows/actions/http.ts:59–101`) — the per-hop check is a detail
  most implementations miss.
- Workflow recursion guard with depth inheritance (`server/lib/events.ts:60–74`),
  preventing unbounded write loops.
- `onConflictDoNothing` on schedule insert (`events.ts:112`).
- Dead-lettering after `MAX_SCHEDULE_ATTEMPTS` rather than retrying forever.

---

## 3. The central gap: there is no Form

Thesis requirement **R-17** is unimplemented. Evidence, in descending order of
severity:

### 3.1 Blocks are untyped bags

```ts
// lib/db/schema.ts:187
export type PageBlockConfig = Record<string, unknown>;
```

```ts
// lib/server/pages/schema.ts:26–32
export const pageBlockSchema = z.object({
  dataSource: z.record(z.string(), z.unknown()).optional(),
  displayConfig: z.record(z.string(), z.unknown()).optional(),
  ...
});
```

There is no schema describing what a List block's `dataSource` may contain. Every
consumer parses it by convention. Nothing can validate a page, diff it
meaningfully, or offer the AI a typed surface to write.

### 3.2 Field metadata is decorative

`lib/server/tables/schema.ts:28–44` defines a `fieldMetadataSchema` that looks
exactly like a Form field: `data_type`, `display_name`, `is_required`,
`is_unique`, `validation_rules`, `visibility_rules`, `ui_hints`.

It is not enforced anywhere:

- `field_metadata` is `.optional().default([])` (`schema.ts:71`), so it may be
  empty on any table.
- `server/repositories/data.ts:40–43` states the consequence outright — the write
  path validates against `information_schema`, **not** `field_metadata`, because
  "most tables would validate against an empty list and reject every write."
- `validation_rules` and `visibility_rules` are read by **zero** call sites
  outside the schema that declares them.
- `is_required` is used only at DDL time (`postgres/create-table.ts:150,159`) and
  in the wizard UI.
- Every other consumer is a UI component: `list-block-view.tsx:89`,
  `record-block-view.tsx:61`, `table-detail-view.tsx:294`,
  `page-grid-editor.tsx:969`.

So: field-level types, validation, and visibility are declared, displayed, and
never enforced. A user who sets a field to "required, admin-only, max 100" gets
none of those guarantees on the API.

### 3.3 Workflow actions target tables, not Forms

```ts
// server/workflows/actions/row.ts:5–22
z.object({ operation: z.literal("create"),
           tableId: z.string().min(1),
           data: z.record(z.string(), z.unknown()) })
```

The predecessor's "submit form" step pointed at a registered form and therefore
knew the field list, types, and validation. Splx's `row` action takes a table id
and an arbitrary bag. The reuse property (R-17) is exactly what is missing, and
this action is where its absence is most visible. Manual `POST .../workflows/:id/run`
also **enqueues** rather than executing in-request (R-17b).

### 3.4 Permissions are global verbs

`server/permissions/definitions.ts:16–49` defines 24 permissions of the form
`resource.action`. `data.edit` grants write access to **every table in the
workspace**. There is no object-, field-, or record-scoped grant (R-7).

`docs/WORKFLOWS.md:61` acknowledges the consequence: granting `workflows.edit`
"is effectively granting write access to every table the action catalog can
reach."

**This is the requirement that blocks the back-office persona.** A read-only
operator view that hides one sensitive field is not expressible today.

### 3.5 Summary

| Form consumer (R-17) | Present? | What exists instead |
| --- | --- | --- |
| UI list/record | Partial | Block config reads `field_metadata` for labels; binds to `tableName` |
| HTTP CRUD through a form | No | Hand-written routes per resource; no `?form=` |
| Permission boundary | No | Global `resource.action` verbs |
| Validation | No | `information_schema` column existence only |
| Workflow write / start payload | No | `row` action against a raw table id; run enqueues |

---

## 4. Configuration lifecycle: absent

Thesis requirements **R-21** through **R-25** have no implementation.

- **No versioning.** `workflows`, `pages`, and `tables` have no version column.
  Editing is destructive.
- **No provenance.** No `origin` field anywhere; nothing distinguishes
  platform-shipped config from tenant-authored config.
- **No blueprints.** No packaging, registry, install, or upgrade path.
- **No export/import.** Grep for serialisation across `server/` and
  `lib/server/` returns nothing. Config exists only as database rows. The one
  export in the codebase is `/api/dev/roles/export`, a dev affordance.
- **No environments.** No sandbox/production notion per workspace.

The practical consequences:

1. **Improvements cannot be shared across clients.** The central economic
   argument for this category of system is currently unavailable.
2. **Config cannot be reviewed before it lands.** No diff, no approval, no dry
   run.
3. **Config cannot be rolled back.** A bad edit to a workflow is unrecoverable
   except from a database backup.
4. **Promotion is manual re-entry.** Building in sandbox and repeating in
   production by hand.

This is the largest gap by volume of missing work, and — per §5.2 of the thesis —
the fix is *provenance and versioning*, not files. Files are an export target
(R-24) once the model underneath supports them.

---

## 5. Correctness tiers

Thesis **R-19/R-20**: no Tier 1 exists, and Tier 2 is not durable-execution
grade. Specific defects, in severity order.

### 5.1 Retries restart workflows from step 0 — duplicate side effects

`server/workflows/worker.ts:173` iterates `steps.entries()` from index 0.
`handleFailure` (298–325) returns the schedule row to `pending` for another
attempt. `runContext.steps` is rebuilt empty at 156–159. There is no record of
which steps already completed.

**Failure scenario.** A three-step workflow: (1) `row` create a payment record,
(2) `http` POST to a payment rail, (3) `send_email` confirmation. Step 2 times
out at 15s (`http.ts:5`). The schedule row goes back to `pending`. On retry,
**step 1 runs again**, creating a second payment record, and step 2 fires a
second rail request. Up to `MAX_SCHEDULE_ATTEMPTS` times.

This is the most serious defect in the codebase. It is invisible in testing
because it only manifests under partial failure.

**Required:** step-level checkpointing (persist completed step outputs on the
schedule row and resume from the first incomplete step), plus idempotency keys on
every external effect (R-13).

### 5.2 Events are not transactionally coupled to the writes that cause them

`server/lib/events.ts:36–124`. `emitEvent` opens its own transaction on the
**control-plane** database. In hosted mode the row that triggered it was written
to the **resource store** — a different database (`lib/server/tenant/resource-store.ts`).
No cross-database transaction exists.

Worse, the entire function is wrapped in `try/catch` that logs and swallows
(117–123). So:

> Row commits → `emitEvent` fails → nothing retried, nothing surfaced beyond a
> console line → the workflow never runs.

`docs/WORKFLOWS.md:29` calls this deliberate: "deliberately unable to fail the
originating mutation." That reasoning is right for analytics events and wrong for
a payment instruction or a stock decrement.

**Required:** a genuine transactional outbox — write the event to an outbox table
in the *same* transaction and database as the mutation, with a relay process
moving it to the control plane. This is R-13's most important instance.

### 5.3 No time-based triggers

`lib/db/schema.ts:517` — `trigger_type` is an unconstrained `text`, and the only
values produced are `event` and manual/trigger-block enqueues
(`worker.ts:345–393`). `docs/WORKFLOWS.md:15` acknowledges time triggers as
future work.

Against thesis §2.1 primitive 9 (Schedule), this removes: interest accrual,
end-of-day batch, statement generation, subscription renewal, dunning, abandoned
cart, appointment reminders, and recurrence. That is a large fraction of all
three reference systems.

The infrastructure is already there — `workflow_schedule` has `run_after`, and
the doc anticipates it. This is small work with large coverage.

### 5.4 Workflow definitions are not versioned

`worker.ts:125–129` loads the *current* definition at execution time. An in-flight
retry therefore executes whatever the definition was edited to in the interim, and
`workflow_runs.steps` records what happened but not what the rules *were*.

Violates **R-2** and **R-9**. For any regulated domain this is disqualifying on
its own: you cannot reconstruct which logic applied to a given transaction.

### 5.5 No ledger or reservation primitive

Thesis **R-5**. Nothing in the codebase enforces a balance, a reservation, or a
non-overlapping allocation. Money in a dynamic table passes through `bindValue`
(`data.ts:223–228`), which forwards JavaScript numbers — float64 — to the driver.
No currency type, no decimal enforcement, no double-entry, no posting/value date
distinction.

Overselling, double-booking, and overdrafting are all currently possible and all
the same missing primitive.

### 5.6 No segregation of duties

`docs/WORKFLOWS.md:61` — workflows execute with **workspace authority**, not the
triggering user's, and the only check is at authoring time. No maker-checker
anywhere (**R-8**).

---

## 6. Security and multi-tenancy findings

### 6.1 Report queries: blocklist over `sql.raw`, no tenant scoping — **high**

`lib/server/reports/run-query.ts`:

```ts
14   if (!normalized.startsWith("select")) { ... }
18   const forbidden = ["insert","update","delete","drop","alter","truncate"];
19   if (forbidden.some((k) => normalized.includes(`${k} `))) { ... }
34   const wrapped = sql.raw(`SELECT * FROM (${cleanQuery}) AS report_subquery LIMIT ${MAX_ROWS}`);
```

Two problems, the second worse than the first:

1. **The blocklist is string matching on lowercased text**, keyed on
   `keyword + " "`. Tabs, newlines, parentheses, and comments defeat it
   (`delete\tfrom`, `delete/**/from`). It also false-positives on legitimate
   queries containing those words in literals.
2. **There is no workspace scoping at all.** The query runs against the resource
   store with whatever privileges the connection has. In **local mode** the
   resource store is the same database as the control plane, so a user with
   `reports.edit` can `SELECT * FROM workspace_users`, `SELECT * FROM users`, or
   read any other workspace's rows in any shared table.

Local mode is documented as the development default, but it is also the
single-database deployment shape — this is a genuine cross-tenant read.

**Required:** allowlist rather than blocklist; run reports through a role with
`SELECT`-only grants on tenant-visible relations; force workspace predicates; or
restrict reports to a query builder over registered Entities rather than raw SQL.

### 6.2 Resource store picks the wrong connection — **medium**

`lib/server/tenant/resource-store.ts:125–137`. With no explicit connection id, the
default is *the oldest `workspace_apps` row for the workspace*, with **no filter
on `type`**:

```ts
.where(eq(workspaceApp.workspace_id, workspaceId))
.orderBy(asc(workspaceApp.created_at))
.limit(1);
```

`workspace_apps` also stores OpenAI connections (migration
`20251115090000_add_openai_workspace_app_type.sql`). A workspace that connected
OpenAI before Postgres resolves its *data store* to the OpenAI row, and
`createAdapterForConnection` (146–166) throws `Unsupported connection type`.

Fix is one predicate, but it should also be explicit which connection is the
primary data store rather than implied by creation order.

### 6.3 Permission checks fail open — **medium**

`server/permissions/check.ts:69–75` catches **any** error from loading
`role_permissions` and falls back to the static default map. A transient database
error therefore silently substitutes a different permission set rather than
denying. Fail-open is the wrong direction for an authorisation decision; the
fallback is justified for a fresh checkout but should be gated on an explicit
"not migrated" signal, not on `catch (error)`.

Related: `check.ts:62–64` treats an empty `role_permissions` table as
"seed never ran" and returns the static map — reasonable, but combined with the
above it means two distinct failure modes both silently grant.

### 6.4 Custom roles are denied everything — **medium**, documented

`server/permissions/definitions.ts:78–82` documents it precisely: `roles` is
workspace-scoped (composite PK `workspace_id, id`) while `role_permissions` is
global, so a workspace defining a custom role receives permissions from neither
source. Custom roles are table stakes for a multi-tenant product; this needs
fixing before clients arrive.

### 6.5 Credentials

`lib/db/schema.ts:173` — `credential_ref` is `text().notNull()`. The indirection
is right; what it points at and whether it is encrypted at rest with rotation
needs to be settled before any real integration credential is stored (R-16).

---

## 7. Scale and operational readiness

### 7.1 Connection churn — **medium**

`dataRepository` calls `withStore` on **every** operation
(`data.ts:376–383`), and `getResourceStore` in hosted mode opens a *new*
`postgres()` pool to the control plane just to resolve the connection, then
tears it down (`resource-store.ts:78–96`), before creating another pool for the
tenant. So a single row read costs two pool create/destroy cycles.

Violates **R-29**. Under any real concurrency this exhausts connection slots and
adds latency. Needs a per-tenant cached pool with idle eviction.

### 7.2 Worker execution model

`processDueSchedules` runs in-process, triggered by a cron route or an
opportunistic nudge after `emitEvent` (`server/workflows/nudge.ts`). Per **R-28**
this is a development affordance. There is no separate worker tier, no per-tenant
concurrency limit (**R-30**), no queue fairness, and no operational surface for
the dead-letter queue (**R-15**) beyond querying the table.

### 7.3 Dual API surface — **medium**

79 route files under `app/`, 34 of them under `app/api/v1/`. Many are duplicated
pairs: `/api/pages` and `/api/v1/pages`, `/api/tables` and `/api/v1/tables`,
`/api/reports` and `/api/v1/reports`, `/api/workspace/*` and
`/api/v1/workspace/*`. `docs/API_CONTROL_PLANE.md` acknowledges routes still on
the older `resolveTenantContext()` + `requireCapability()` pattern.

Two parallel auth and permission paths is where security defects live — a fix
applied to one is easily missed on the other. Finish and delete.

### 7.4 Test coverage

15 unit/integration test files under `server/` and `lib/`, well-chosen where they
exist (injection behaviour, permission matching, SSRF, comms merge, workflow
integration). But:

- The four Playwright e2e tests (`tests/e2e/`) all cover the **legacy chat**
  surface — artifacts, chat, reasoning, session. None cover pages, tables,
  reports, workflows, or the v1 API.
- No tests for the page builder, the report path, tenant resolution, or hosted
  mode.
- `.eve/dev-runtime/snapshots/` contains many full copies of the source tree
  including tests; worth confirming it is git-ignored and excluded from any
  coverage tooling.

---

## 8. AI parity (R-3): not started

- `agent/tools/` contains only a README stating splx tools "land here" and that
  it is "empty on day one."
- `agent/instructions.ts:8–10` confirms the agent is deliberately tool-agnostic.
- The agent therefore has the eve built-ins (`web_search`, `todo`,
  `ask_question`, subagent) and **no ability to read or write workspace data**.

This is understood and intentional per `docs/EVE_AGENT_PORT.md` §8 — the harness
was the priority. Worth stating plainly that the product thesis is 0%
implemented, and that it should stay that way until the Form exists, because
the Form is what makes the data tool surface small, typed, and safe to expose
(workflows are the process surface).

Sequencing it the other way — tools over raw tables — would build the AI a
permanent bypass around the abstraction that is supposed to govern it.

---

## 9. Alignment scorecard

| Req | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| R-1 | Behaviour as declared objects | ◐ Partial | Workflows yes; interfaces no |
| R-2 | Versioned objects, versioned executions | ✗ | No version columns |
| R-3 | AI parity | ✗ | `agent/tools/` empty |
| R-4 | Ten primitives first-class | ◐ | Party/Transaction/Message present; Resource/Position/Case/Document absent |
| R-5 | Resource allocation primitive | ✗ | None |
| R-6 | Separate staff/customer auth realms | ✗ | Staff only |
| R-7 | Object/field/record/action authz | ✗ | Global verbs only |
| R-8 | Segregation of duties | ✗ | Workspace authority |
| R-9 | Audit includes rule version | ◐ | Audit yes; version no |
| R-10 | Authz at query | ◐ | Workspace predicate yes; finer no |
| R-11 | Reporting & reconciliation | ◐ | Reports exist (unsafe); no reconciliation |
| R-12 | Bulk import/export | ✗ | None |
| R-13 | Idempotency everywhere | ✗ | §5.1, §5.2 |
| R-14 | Environments | ✗ | None |
| R-15 | Observability & DLQ surface | ◐ | Dead-letter status exists; no surface |
| R-16 | Connector primitive | ◐ | `workspace_apps` is a seed |
| R-17 | **Form** (field projection) | ✗ | §3 |
| R-17b | Sync on-demand workflow invoke | ✗ | enqueue-only `POST .../run` |
| R-18 | Entity/Form/Workflow separation | ✗ | Tables only |
| R-19 | Tier assignment | ✗ | Not a concept |
| R-20 | Engine drives ledger, isn't one | n/a | No ledger |
| R-21 | Blueprints | ✗ | §4 |
| R-22 | Provenance | ✗ | §4 |
| R-23 | Upgrade as merge | ✗ | §4 |
| R-24 | Config export/import | ✗ | §4 |
| R-25 | Environment promotion | ✗ | §4 |
| R-26 | One renderer, many personas | ◐ | One renderer; no capability gating |
| R-27 | Work-centric operator home | ✗ | Builder navigation only |
| R-28 | Independent workers | ✗ | In-process |
| R-29 | Pooled connections | ✗ | §7.1 |
| R-30 | Per-tenant fairness | ✗ | None |

**5 partial, 1 n/a, 24 unmet** — but weighted by cost, the expensive
infrastructure (control plane, safe data access, event/schedule/run model,
tenant isolation) is the part that exists.

---

## 10. Defect register

Ordered by severity, for the plan to consume.

| # | Severity | Defect | Location |
| --- | --- | --- | --- |
| D-1 | **Critical** | Workflow retry restarts at step 0 → duplicate side effects | `worker.ts:173`, `298–325` |
| D-2 | **Critical** | Events not transactional with mutations; failures swallowed | `events.ts:36–124` |
| D-3 | **High** | Report SQL: blocklist over `sql.raw`, no tenant scoping | `run-query.ts:12–36` |
| D-4 | **High** | Workflow definitions unversioned; retries run edited logic | `worker.ts:125–129` |
| D-5 | Medium | Resource store resolves oldest app row regardless of type | `resource-store.ts:125–137` |
| D-6 | Medium | Permission load failure falls back to static map (fail-open) | `check.ts:69–75` |
| D-7 | Medium | Workspace-scoped roles vs global `role_permissions` → custom roles denied | `definitions.ts:78–82` |
| D-8 | Medium | Pool created and destroyed per operation | `data.ts:376–383`, `resource-store.ts:78–96` |
| D-9 | Medium | Dual API surface, two auth paths | `app/api/*` vs `app/api/v1/*` |
| D-10 | Low | No time-based workflow triggers | `schema.ts:517` |
| D-11 | Low | e2e coverage is legacy-chat only | `tests/e2e/` |

---

## 11. What not to change

Worth stating explicitly, because a plan this large invites over-correction:

- **`endpoint()` stays.** Forms should generate its config, not replace it.
- **The three-table workflow split stays.** It is correct. On-demand invoke
  becomes a second *start mode* of the same runner, not a second engine.
- **`dataRepository`'s safety model stays.** Forms add a validation layer
  *above* it; the `information_schema` allowlist remains the last line of defence.
- **Database-as-config-storage stays.** The thesis (§5) argues files are an
  export target, not the storage model. The original instinct was right.
- **Per-tenant database isolation stays.** It is the hard part of hosted mode and
  it works.

---

Continue to [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).

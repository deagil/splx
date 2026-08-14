# Splx — Development Plan

> Bridges [SYSTEM_THESIS.md](./SYSTEM_THESIS.md) (target) and
> [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md) (present). Requirement
> references are `R-n`; defect references are `D-n`.
>
> Sizes are relative (S ≈ days, M ≈ 1–2 weeks, L ≈ 3–6 weeks, XL ≈ a quarter) for
> one experienced person working with AI assistance. They are for sequencing
> arguments, not commitments.

---

## 1. Sequencing principles

Four rules decide the order of everything below.

1. **Fix what silently corrupts, first.** D-1 and D-2 lose or duplicate work
   without surfacing an error. Every feature built on top inherits them, and each
   one makes them harder to fix. Nothing else goes first.
2. **The Form precedes everything that would consume it.** Authorisation
   depth, the operator UI, AI tools, and blueprints all need something to point
   at. Building any of them first means building it twice.
3. **Don't build Tier 1 until a vertical demands it.** A ledger built
   speculatively will be wrong. Build it when the first real allocation problem
   (slots, stock, balance) arrives, and build only that.
4. **Keep the tenant boundary honest while there is one tenant.** Provenance
   (R-22) and versioning (R-2) must be present from the first Form, because
   retrofitting them onto config that never had them means rewriting every
   object. This is cheap now and expensive later.

### The critical path

```
Phase 0 ──► Phase 1 ──┬──► Phase 2 ──► Phase 5
 defects    Form       │   config       AI
                       ├──► Phase 3     lifecycle
                       │    durable
                       └──► Phase 4
                            authz + operator
                                    │
                            Phase 6 ─┘  Tier 1, when a vertical needs it
                            Phase 7     scale, continuous
```

Phases 2, 3 and 4 are independent of each other and can be interleaved by
appetite. Phase 5 needs 1 and benefits enormously from 2.

---

## 2. Phase 0 — Stop the silent failures

**Goal:** no code path loses or duplicates work without surfacing it.
**Size:** M. **Blocks:** everything.

| # | Work | Addresses | Size |
| --- | --- | --- | --- |
| 0.1 | **Step-level checkpointing.** Persist completed step outputs on `workflow_schedule` (`completed_steps jsonb`); on claim, resume from the first incomplete step rather than index 0. Rehydrate `runContext.steps` from it. | D-1 | M |
| 0.2 | **Idempotency keys.** Add an optional `idempotencyKey` to the `http` action, sent as a header; derive a deterministic default from `(runId, stepIndex)`. Same for `send_email`. | D-1, R-13 | S |
| 0.3 | **Transactional outbox.** New `event_outbox` table **in the resource store**, written in the same transaction as the mutation by `dataRepository`. A relay moves rows to `event_logs` + fan-out, marking them sent. `emitEvent` keeps its signature. | D-2, R-13 | M |
| 0.4 | **Surface emit failures.** Remove the blanket swallow in `events.ts:117–123`. Failures increment a counter and land in a visible failure table; the mutation still succeeds, but silence ends. | D-2, R-15 | S |
| 0.5 | **Report query lockdown.** Replace the blocklist with: a dedicated read-only database role, an allowlist of relations derived from registered tables, and a forced workspace predicate. If that is not achievable quickly, gate reports behind `workspace.admin` as an interim and record the decision. | D-3 | M |
| 0.6 | **Connection type filter.** Filter `resolveWorkspaceConnection` on the connection types that can actually back a resource store; add an explicit `is_primary_store` flag rather than relying on creation order. | D-5 | S |
| 0.7 | **Fail closed on permissions.** Gate the static fallback on an explicit "schema not migrated" probe rather than `catch (error)`. Any other failure denies. | D-6 | S |
| 0.8 | **Workspace-scoped role permissions.** Make `role_permissions` workspace-scoped (or add a workspace-scoped override table with a documented resolution order) so custom roles resolve. | D-7 | M |

**Exit criteria:** an integration test proving that a workflow whose step 2 fails
does not re-execute step 1 on retry; a test proving an event survives a
control-plane outage during a resource-store write; a test proving a report
cannot read another workspace's rows in local mode.

---

## 3. Phase 1 — Forms and HTTP CRUD

**Goal:** implement R-17 / R-17b / R-18 — Forms as data definitions, CRUD as
HTTP through a Form, workflows as process definitions invoked with POST.
**Size:** L. **This is the phase that makes splx the system in the thesis.**

### 3.1 Model

Two new control-plane tables (workflows already exist). Note `version` and
`origin` from day one (rule 4).

```
entities                          forms
──────────                        ─────────
workspace_id                      workspace_id
id            (e.g. "booking")    id              (e.g. "booking.staff")
name                              version         int, immutable once published
storage_ref   → physical table    entity_id       → entities.id
labels                            permission      permission string
origin        blueprint|local     methods         GET|POST|PATCH|DELETE[]
origin_ref    blueprint@version   fields          jsonb (typed, see thesis §3.2)
origin_rev    upstream revision   reserves        jsonb, nullable (Phase 6 hook)
locally_modified boolean          emits           event name, nullable
                                  status          draft|published|archived
                                  origin / origin_ref / origin_rev / locally_modified
```

No `operation` column. Create vs update is `POST` vs `PATCH` through the same
form. `booking.reschedule` is a **workflow**, not a form.

`entities` mostly wraps what `tables` already does — do not duplicate it.
Introduce `entities` as a thin layer over the existing table config and migrate,
rather than a parallel concept.

### 3.2 Work

| # | Work | Addresses | Size |
| --- | --- | --- | --- |
| 1.1 | `entities` + `forms` schema, Zod definitions, repository with audit and events. Typed `fields` schema — no `Record<string, unknown>`. | R-17, R-18, R-2, R-22 | M |
| 1.2 | **Form apply engine.** `applyForm(form, method, input, tenant)` — resolve version, check permission and allowed method, validate field-by-field, strip fields the caller may not read/write, apply computed/read-only, delegate to `dataRepository`, emit if declared. Shared by HTTP and workflow steps. | R-17, R-7 | L |
| 1.3 | **Generic entity routes.** `GET/POST /api/v1/entities/[entityId]` and `GET/PATCH/DELETE /api/v1/entities/[entityId]/[recordId]` on `endpoint()`, with `?form=` selecting the projection. Auth, permission and schema come from the Form. One resource surface replaces N hand-written routes. | R-17 | S |
| 1.4 | **Field-level authorisation** in the engine: `visibleTo` / `writableBy` per field, enforced on both read projection and write. | R-7 | M |
| 1.5 | **Workflows through Forms.** Write steps apply a form (same engine as HTTP). Keep `row` as an admin-only escape hatch. **On-demand `POST /api/v1/workflows/[id]/run` executes in-request**, synchronously, under the caller's permissions; event/timer starts stay queued. Start payload is typed by a form. | R-17, R-17b | M |
| 1.6 | **Block config typing.** Replace `PageBlockConfig = Record<string, unknown>` with a discriminated union per block type, where List/Record blocks reference a **form id** rather than a table name. Trigger blocks already reference a workflow id. | D (§3.1) | M |
| 1.7 | **Migration path.** Generate a default Form per existing table (`<table>.default`) from current `field_metadata`, so existing pages keep working. Dual-read during transition. Do **not** generate `.create` / `.update` / `.read` clones. | — | M |
| 1.8 | **Form editor UI** — field list, type, validation, visibility, allowed methods. The visual surface the thesis promises. | R-26 | L |
| 1.9 | **Computed fields.** `source: "computed:<expr>"` evaluated by the engine, so a derived value is identical in UI, API and workflow contexts. Pure expressions only — no side effects. | R-35, C-13 | M |

### 3.3 Exit criteria

- A page block and an HTTP call write the same record through the same Form,
  and reject the same invalid input with the same message.
- A workflow write step applying that Form is identical to the HTTP path.
- `POST /api/v1/workflows/[id]/run` from a Trigger block returns the run
  result in the same request (not 202 + poll), as the signed-in user.
- Setting a field to `visibleTo: [role:admin]` hides it from a non-admin in the
  UI **and** strips it from the API response.
- `field_metadata` is no longer read by UI components for anything the Form
  now owns.

---

## 4. Phase 2 — Configuration lifecycle

**Goal:** R-21 to R-25. This is what converts agency effort into leverage.
**Size:** L. **Depends on:** Phase 1 (needs objects worth versioning).

| # | Work | Addresses | Size |
| --- | --- | --- | --- |
| 2.1 | **Versioning for all executable config.** Workflows, forms, entities get immutable published versions; edits create drafts. `workflow_runs` and audit entries pin the version executed. | R-2, R-9, D-4 | M |
| 2.2 | **Provenance columns** on every config object (`origin`, `origin_ref`, `origin_rev`, `locally_modified`), set on write. | R-22 | S |
| 2.3 | **Deterministic export.** Serialise a workspace's config to a stable file tree — sorted keys, one object per file, no timestamps or ids that churn. Byte-identical export for an unchanged workspace. | R-24 | M |
| 2.4 | **Import with dry-run.** Read the tree back, report what would change, then apply. Round-trip test: export → import → export produces identical bytes. | R-24 | M |
| 2.5 | **Blueprint packaging.** A blueprint is a versioned export plus a manifest (id, semver, platform version range, dependencies, seed data). Publish to a registry — a table plus object storage is sufficient to start. Namespace object ids by owning blueprint, with ids stable and independent of display names so renames stay tractable. **Do not build dependency resolution yet** (R-38) — reserve the manifest field, ship flat verticals. | R-21, R-38 | M |
| 2.6 | **Install.** Materialise a blueprint's objects into a workspace with provenance recorded. | R-21 | M |
| 2.7 | **Upgrade as three-way merge.** Compare (installed revision, current tenant state, new blueprint revision) per object and per field. Auto-apply unmodified, keep local-only, surface conflicts for decision. Dry-run first, always reversible. | R-23 | L |
| 2.8 | **Environments.** `environment` on workspace (`sandbox` \| `production`), with promotion as "install blueprint version X + apply this reviewed diff" using 2.7's machinery. | R-14, R-25 | M |
| 2.9 | **Fleet view.** Cross-tenant report of which config objects are locally modified and how, so repeated local work can be spotted and generalised. Without it the harvest loop cannot be operated. | R-37 | M |

**Exit criteria:** two workspaces on `bookings@1.0.0`; one has locally edited a
Form and added a workflow; publishing `1.1.0` upgrades both, preserving the
local edit, flagging exactly one conflict, and leaving the local workflow
untouched.

**This is the phase that answers the question you raised.** After it, the answer
to "how does git-committed config work in multi-tenancy" is: it doesn't need to.
Provenance plus versioned blueprints plus three-way merge gives you what git was
giving you, and export (2.3) gives you the repo when you want one.

---

## 5. Phase 3 — Durable execution and scheduling

**Goal:** make Tier 2 actually Tier 2.
**Size:** M–L. **Independent of Phases 2 and 4.**

| # | Work | Addresses | Size |
| --- | --- | --- | --- |
| 3.1 | **Time-based triggers.** `trigger_type = schedule` with cron or interval; a planner enqueues `workflow_schedule` rows. Infrastructure already supports it via `run_after`. | R-4 (#9), D-10 | M |
| 3.2 | **Version pinning at enqueue** — the schedule row records the workflow version, and the worker loads that version. | R-2, D-4 | S |
| 3.3 | **Compensation.** Optional `onFailure` steps per step, executed in reverse for completed steps when a run fails terminally. | R-19 | M |
| 3.4 | **Wait and approval steps.** `wait_until` and `await_approval` (suspends the run, creates a Case, resumes on decision). Prerequisite for maker-checker. | R-8 | M |
| 3.5 | **Dead-letter surface.** A UI listing failed schedules with the error, the run trace, and replay/discard actions. | R-15 | M |
| 3.6 | **Worker tier separation.** Extract the worker to a process that can run independently of the web tier; keep the nudge for local dev. | R-28 | M |
| 3.7 | **Per-tenant concurrency limits** in the claim query. | R-30 | S |
| 3.8 | **Record timers.** Timers bound to a record and expressed relative to a field or status change ("24h before `starts_at`"), automatically rescheduled or cancelled when the record changes. Distinct from cron — this is the one every reminder, SLA and dunning rule needs. | R-32, C-5b | M |
| 3.9 | **State machines.** Declared statuses, legal transitions, guards, and per-transition permissions on an Entity. Transitions emit events, so workflows subscribe to them rather than to raw column changes. | R-31, C-6 | M |

---

## 6. Phase 4 — Authorisation depth and the operator persona

**Goal:** R-7, R-8, R-26, R-27. This is what makes the system usable by the
client's own staff — the thing that turns one delivery into a durable account.
**Size:** L. **Depends on:** Phase 1.

| # | Work | Addresses | Size |
| --- | --- | --- | --- |
| 4.1 | **Record-scoped grants.** Declarative scope on a role–permission grant (`branch_id = user.branch_id`), compiled into a query predicate in `dataRepository.list/get`, not filtered in the UI. | R-7, R-10 | L |
| 4.2 | **Action permissions** as first-class objects, so a Trigger block renders only when the operator may run that workflow. | R-7 | S |
| 4.3 | **Maker-checker.** Mark a Form write or a workflow as requiring approval; submission creates a pending change plus a Case; a second user with the approval permission releases it. Uses 3.4. | R-8 | L |
| 4.4 | **Case primitive.** Entity + Forms + queue view for assignee, status, SLA, and history. Thesis primitive #6 — present in all three reference systems, absent today. | R-4 | L |
| 4.5 | **Operator mode.** Same renderer, builder chrome gated on `forms.edit`/`pages.edit`. | R-26 | M |
| 4.6 | **Work-centric home** — my queue, my cases, awaiting my approval, recent activity. | R-27 | M |

---

## 7. Phase 5 — AI parity

**Goal:** R-3. **Size:** M. **Depends on:** Phase 1; much better after Phase 2.

Deliberately late. Tools written now would target raw tables and become a
permanent bypass around the abstraction meant to govern them
(see review §8).

| # | Work | Addresses | Size |
| --- | --- | --- | --- |
| 5.1 | **Read tools** — list entities, read a Form, query records through a Form. Permission-checked as the signed-in user, audited identically. | R-3 | M |
| 5.2 | **Write tools** — HTTP through a Form, invoke a workflow, create/edit a Form, create/edit a workflow, create/edit a page. Every write goes through the same engine a human uses. | R-3, R-1 | M |
| 5.3 | **Propose-and-review.** AI config edits land as **drafts** (Phase 2.1) with a rendered diff the user approves. This is the thesis in one interaction: AI authors, human reviews structured config rather than code. | R-3, R-2 | M |
| 5.4 | **Explain mode** — given a Form, workflow, or page, describe in plain language what it does, for the non-technical reviewer. The other half of "review and understand". | Thesis §1.3 | S |

**Exit criteria:** every AI tool call produces an `audit_logs` entry
indistinguishable in shape from the equivalent human action, and no tool can
reach a capability the user lacks.

---

## 8. Phase 6 — Tier 1, when a vertical demands it

**Goal:** R-5, R-20. **Size:** L per mechanism. **Trigger:** the first real
allocation requirement.

Build only the mechanism the vertical needs. All three below are the same shape
— a reservation with an enforced invariant — but do not generalise prematurely.

| Mechanism | Needed by | Invariant |
| --- | --- | --- |
| **Slot reservation** | Bookings | No two confirmed bookings overlap for one resource |
| **Stock reservation** | Shop | Sum of reservations + allocations ≤ on hand |
| **Ledger posting** | Lending / banking | Double-entry balances; no unauthorised negative balance |

Design constraints (thesis §4):

- Implemented in **code**, not config. Forms used for writes may declare they
  reserve a resource (`reserves` in thesis §3.2); the engine executes it.
- Enforced by database constraints where possible — exclusion constraints for
  slots, check constraints for balances — not application-level read-then-write.
- Exactly-once via idempotency keys on every posting.
- Immutable and append-only; corrections are reversing entries, never updates.
- Money as `numeric` with explicit currency, never a JavaScript number. Fix
  `bindValue`'s float path for money-typed fields.

**On core banking specifically:** with Phases 0–4 and a ledger, splx becomes a
credible orchestration and operations layer for a lender or a bank's back office.
It should still not be the ledger of record for a licensed bank — that is either
a purpose-built ledger service or a vendor (Vault, Mambu, 10x), with splx driving
it (R-20). The predecessor got away with the opposite because of a decade of
hardening against one contract; that is not a repeatable starting position.

---

## 9. Phase 7 — Scale and operations (continuous)

| # | Work | Addresses | Size |
| --- | --- | --- | --- |
| 7.1 | Per-tenant pooled connections with idle eviction; stop creating a pool per operation | R-29, D-8 | M |
| 7.2 | Complete the v1 migration; delete legacy duplicates and the second auth path | D-9 | M |
| 7.3 | Connector primitive: credential encryption + rotation, signed inbound webhooks with replay protection, outbound retry with idempotency, reconciliation job, health | R-16 | L |
| 7.4 | Bulk import/export for records (distinct from config export) | R-12 | M |
| 7.5 | Per-tenant observability: queue depth, failure rate, run latency, DLQ size | R-15 | M |
| 7.6 | Test coverage: e2e for pages/tables/contracts/workflows; hosted-mode integration tests | D-11 | L |

---

## 9a. Capability backlog

Capabilities surfaced by the domain decomposition (thesis §2.2) that no phase
above claims. Each is small, and each is pulled in by the first vertical that
needs it rather than built speculatively.

| Capability | Requirement | Pulled in by | Size |
| --- | --- | --- | --- |
| **Document rendering** — versioned template → retained immutable artefact linked to a record | R-33, C-10/11 | Any vertical needing invoices, statements, confirmations, contracts | M |
| **Sequences** — unique human-readable reference numbers | R-34, C-14 | Invoicing, case refs, order numbers. *Retrofitting gapless numbering is painful — do it before the first invoice ships* | S |
| **Consent and channel preferences** — checked at send time, with auditable basis | R-36, C-8b | Any vertical sending marketing or operating under GDPR | M |
| **File storage** — upload, retain, serve under permission | C-11 | Document uploads, KYC evidence, attachments | M |

## 10. Milestones

| Milestone | Contains | Meaning |
| --- | --- | --- |
| **M1 — Trustworthy** | Phase 0 | Nothing silently loses or duplicates work |
| **M2 — Coherent** | Phase 1 | Forms define data; HTTP CRUD and workflows share them |
| **M3 — Leverageable** | Phase 2 | One core, many clients, improvements propagate |
| **M4 — Operable** | Phases 3 + 4 | Client staff can run the system daily; durable execution |
| **M5 — AI-native** | Phase 5 | The thesis is demonstrable end to end |
| **M6 — Vertical-complete** | Phase 6 + a blueprint | One real vertical shipped to a real client |

M1→M3 is the sequence that changes the economics. M5 is the sequence that
differentiates the product. Do not reorder them: an AI that authors incoherent
config is worse than no AI.

---

## 11. Go-to-market sequencing

### Choose one vertical and build its blueprint first

Recommendation: **bookings / service business** (thesis §9.3).

- Real Tier 1 requirement (slot allocation) but the smallest possible one — good
  forcing function without ledger complexity.
- Short feedback loops; a wrong booking is visible in a day, a wrong interest
  calculation in a quarter.
- Integration surface limited to calendar, PSP, email/SMS.
- Back-office persona is obvious and immediately valuable, exercising Phase 4.
- Low regulatory floor, so Phases 0–4 are sufficient to go live.

Shop second (stock reservation reuses slot reservation's shape). Lending or
banking last, and only with a ledger and a partner.

### The business model question

Your diagnosis — agency revenue scales with headcount — is correct, and pure
self-serve is not the answer for systems of this complexity. The buyers who need
a real workflow-driven back office will not self-serve build it; those who would
self-serve build it will not pay much and will churn.

The path that works is the middle one, and the phases above are what unlock it:

| Stage | Model | Enabled by |
| --- | --- | --- |
| Now | Build for your own delivery work | Current state |
| M3 | Product + implementation. Blueprint does 80%; your hours per client fall, revenue per person rises | Phase 2 |
| M4 | Client staff make tier-3 changes themselves — the "everyone can contribute" property returns, but on the *client's* team | Phase 4 |
| M5+ | Per-vertical self-serve, once a blueprint installs and configures without an expert | Phases 2 + 5 |

**On using it yourself first:** that is the correct sequencing, not a fallback.
You are user #1; your own delivery work is what reveals which primitives are real
and which are imagined. Every platform of this shape — including the one you
worked on — was built to solve its author's delivery problem before it was a
product.

The single trap is letting the tenant boundary go soft because there is only one
tenant. Provenance (R-22) and versioning (R-2) have to be real from the first
Form in Phase 1. They are nearly free now and a rewrite later.

---

## 12. Open decisions

These need your call; they change the plan materially.

| # | Decision | Options | Status |
| --- | --- | --- | --- |
| Q-1 | Name of the data-definition object | `contract` / `form` / `interface` / `view` | **Decided 2026-08-14: `form`.** It is a field projection, not an operation. "Contract" in earlier drafts fused verb + fields; that is rejected. HTTP and workflows *use* a form; they are not themselves the form. |
| Q-2 | What do page blocks bind to? | Table / fused contract / form | **Decided 2026-08-14: form.** List/Record blocks reference a form id. Trigger blocks reference a workflow id. Two binding models (table + form) is the drift the Form exists to prevent. Migrate via 1.7. |
| Q-3 | Reports: raw SQL or a builder over Entities? | Raw (locked down) / builder / both | Open. Recommendation: builder as the default, raw SQL admin-only. Raw SQL over a config-driven system is a permanent tenant-isolation liability |
| Q-4 | Blueprint registry hosting | In-database / object storage / git-backed | Open. Recommendation: in-database + object storage to start; git-backed authoring for your own blueprints |
| Q-5 | Local mode's long-term status | Dev-only / supported deployment | Open. Recommendation: dev-only. If it is a supported shape, D-3-class cross-tenant reads need a permanent structural fix, not a lockdown |
| Q-6 | Customer-facing portal (R-6) | Now / after M4 / never | Open. Recommendation: after M4. It is a second auth realm and a second trust boundary; do not open it before record-scoped authz (4.1) exists |
| Q-7 | First vertical | Bookings / shop / lending | Open. Recommendation: bookings, per §11 |

**Also settled with Q-1/Q-2 (same date), not previously numbered:**

- CRUD is standard HTTP on the entity (`GET/POST/PATCH/DELETE /entities/:id`), applying a form as the projection. Not `POST /c/booking.create`.
- Non-CRUD behaviour is a workflow. `POST /workflows/:id/run` is on-demand and **synchronous** (caller permissions). Event/timer starts stay durable and queued.
- A workflow's start payload and write steps are typed by a form. Raw `row` remains an admin bypass.

---

## 13. Immediate next steps

If you want to start tomorrow, in order:

1. **0.1 step checkpointing** — highest severity, self-contained, ~1–2 days.
2. **0.5 report lockdown** (or the interim admin gate) — the only live
   cross-tenant read.
3. **0.3 transactional outbox** — larger, but every later phase assumes events
   are reliable.
4. **Decide Q-7** — first vertical. Q-1 and Q-2 are settled (form as data
   definition; pages bind to a form; CRUD is HTTP; processes are workflows).

Phase 1 should not start before Phase 0 lands. Forms and sync workflow invoke
built on an execution engine that duplicates side effects would inherit the
defect at a higher level of abstraction, where it is harder to see and harder
to fix.

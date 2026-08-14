# Splx — Data Placement

> Where each kind of data lives, why, and what that means for the harvest loop
> and for analysis. Design intent; [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)
> documents the current mechanics.

---

## 1. Verdict

**The instinct is right and the code is already better than the documentation.**
Configuration lives in the control plane today — which is exactly what the
harvest loop needs — even though `DATABASE_ARCHITECTURE.md` claims otherwise.

Three things need fixing:

1. **The two-plane model should be three.** There is no place for derived,
   scrubbed signal, which is what analysis and model training actually need.
2. **`local` vs `hosted` changes the logical model, not just the physical
   placement.** That is why local mode has weaker isolation properties, and it
   is the root of two separate defects.
3. **User tables carry no `workspace_id`**, so tenant scoping in a shared
   database is impossible by construction, not by oversight.

---

## 2. What is actually where today

Verified against the code, not the doc.

| Data | Plane | How | Doc says |
| --- | --- | --- | --- |
| users, workspaces, workspace_users, roles, role_permissions, invites, teams | **Control** | `getControlPlaneDb()` | ✅ agrees |
| audit_logs, event_logs, event_types | **Control** | `getControlPlaneDb()` | ✅ agrees |
| workflows, workflow_schedule, workflow_runs | **Control** | `getControlPlaneDb()` | ✅ agrees |
| **pages** | **Control** | `createClient()` → `NEXT_PUBLIC_SUPABASE_URL` | ❌ says resource store |
| **tables (config registry)** | **Control** | `createClient()`, and `loadTableConfig` uses `getControlPlaneDb()` | ❌ says resource store |
| **reports** | **Control** | `createClient()` | — |
| **email_templates** | **Control** | `getControlPlaneDb()` | — |
| **agent_threads** (incl. `state` jsonb — conversation content) | **Control** | `getControlPlaneDb()` | — |
| chats, messages, documents, suggestions, votes, streams (legacy) | **Resource store** | `getResourceStore()` via `lib/db/queries.ts` | ✅ agrees |
| user-created physical tables and their rows | **Resource store** | `getResourceStore()` | ✅ agrees |

**Correct the doc.** `pages` and `tables` are control-plane, in both modes. This
matters: someone reading `DATABASE_ARCHITECTURE.md` and "fixing" the code to
match would break the harvest loop before it is built.

### Two inconsistencies worth deciding

- **Two chat systems in two different planes.** Legacy `chats`/`messages` sit in
  the resource store; the new `agent_threads` sits in the control plane. Resolve
  when legacy chat is retired — and see §6 for which is right.
- **`agent_threads.state` holds conversation content in the shared database.**
  Convenient, but it means anything a user pastes into the AI sidebar — including
  customer records — lands in the control plane. That should be a deliberate
  decision, not a side effect.

---

## 3. The target: three planes

| | **Control plane** | **Tenant data plane** | **Telemetry plane** *(new)* |
| --- | --- | --- | --- |
| **Contains** | Identity, RBAC, **all configuration**, provenance, blueprints, workflow definitions, audit and event metadata | Business records, documents, chat message content, user table rows | Derived, scrubbed signal: config shapes, edit traces, run outcomes, AI proposal/correction pairs |
| **Shape** | One shared database | Isolated per tenant | One shared database |
| **Content owned by** | Tenant (schema by you) | **Tenant, absolutely** | You |
| **Cross-tenant queryable** | **Yes** — required | **Never** | Yes — already anonymised |
| **On offboarding** | Exported as config, then deleted | Everything exported, database decommissioned | Nothing to remove — no tenant content in it |
| **Contains business records** | **No** | Yes | **No, by construction** |

The line that matters, and the only one worth being dogmatic about:

> **Business records never leave the tenant plane. Configuration and derived
> signal never contain business records.**

Everything else follows from that.

---

## 4. Placement decision procedure

For any new table, in order:

1. **Is it a customer's business record, or free text they authored?**
   → Tenant plane. Stop.
2. **Is it configuration — something a builder authored that describes how the
   system behaves?** → Control plane. It must be cross-tenant queryable or the
   harvest loop cannot see it.
3. **Is it identity, access, or platform bookkeeping?** → Control plane.
4. **Is it derived signal with tenant content removed?** → Telemetry plane.
5. **Is it a record *about* tenant activity (audit, event, run history)?**
   → Control plane for the metadata; **the payload needs a decision.**

Point 5 is the sharp edge. `event_logs.payload` currently contains the full
record for `db.*.created` events, and `audit_logs.changes` contains the written
fields. **Both put business data in the control plane today.** Options:

- Store a reference and field names rather than values (loses replay ability).
- Keep payloads in the tenant plane, metadata in the control plane (correct, more
  work — the workflow fan-out needs the payload).
- Accept it and treat the control plane as tenant-confidential (simplest; means
  the control plane inherits the strictest data handling obligations).

Recommendation: **accept it for now and document it**, but exclude audit and
event payloads from anything that feeds the telemetry plane. Revisit if a client
has data residency or processor requirements that make it untenable.

---

## 5. What the harvest loop needs

Loop D ([DELIVERY_LIFECYCLE.md](./DELIVERY_LIFECYCLE.md)) asks one question
across every tenant:

> Which config objects have been locally modified, how, and by how many clients?

That requires **configuration plus provenance in one queryable database**. Since
each tenant's data plane is a separate database in hosted mode, config in the
tenant plane would make the query impossible — you would be federating across N
databases to answer it.

**Good news: config is already in the control plane.** The harvest loop needs no
data movement. What it needs is the provenance columns from Phase 2 (R-22) and
the fleet view (R-37).

What harvest does **not** need, ever: a single business record. Clean line.

---

## 6. Analysis and model training

### 6.1 The valuable data is not what you would expect

For making an AI good at *your system specifically*, the training signal is:

| Signal | Value | Where it comes from |
| --- | --- | --- |
| `(natural language request) → (resulting config diff)` | **Highest** | Phase 5 AI authoring |
| `(AI proposal) → (human correction)` | **Highest** — this is preference data, and nobody else has it | Propose-and-review (SPX-500) |
| `(config) → (validation failure / workflow error)` | High | Form apply engine, workflow runs |
| Config shapes across tenants — which field types, which workflow patterns co-occur | Medium, and it doubles as harvest input | Control plane |
| **Customer business records** | **Near zero** | — |

The last row is the important one. Business records would teach a model about one
client's customers. They are not what makes an assistant good at building
systems — config and the interaction *around* config are.

**Convenient alignment: the most valuable data is also the least legally
fraught.** You do not need customer records, so do not take them.

### 6.2 The legal line

Being blunt because it is cheaper now than later:

- Business records in a tenant plane are the client's data and you are a
  processor. Using them to train a model is a **new purpose**, requiring a lawful
  basis and almost certainly explicit contractual permission. Not something to
  decide after the fact.
- Aggregate configuration and interaction metadata is a much easier case,
  particularly when scrubbed of free text and identifiers — but it still belongs
  in the terms explicitly.
- **Put it in the contract from client #1.** A "we may use aggregate
  configuration and usage metadata to improve the platform; your business records
  are excluded" clause is trivial to include up front and effectively impossible
  to retrofit across an existing customer base.

### 6.3 Chat threads: the ambiguous middle

Thread *structure* (which tools ran, what config resulted, whether the user
accepted the proposal) is clean signal. Thread *content* may contain anything the
user pasted, including customer records.

So split them:

- **Content** → tenant plane, deleted on offboarding, never in telemetry.
- **Trace** (tool calls, config diffs produced, accepted/rejected/edited) →
  telemetry plane, scrubbed.

Deriving the trace forces the scrubbing to be an explicit step rather than an
optional one. This is the argument for moving `agent_threads` content to the
tenant plane, and it contradicts where it sits today.

### 6.4 The thing that is easy to get wrong

> **You cannot retroactively collect proposal/correction pairs.**

If Phase 5 ships without capturing what the AI proposed, what the human changed
it to, and whether it was accepted, that signal is gone permanently. Same for
config edit history without provenance.

**Therefore: build telemetry *capture* alongside Phase 2 provenance, even if
nothing analyses it for a year.** Capture is cheap; reconstruction is impossible.

Note also that the same captured corpus serves three purposes, and the two
nearer-term ones matter more than fine-tuning:

1. **Evals** — a test set of "request → correct config" is what tells you whether
   an AI change made things better. You need this before you need a fine-tune.
2. **Few-shot and retrieval** — your own corpus as context.
3. **Fine-tuning a small model** — plausible later, and by then you will know
   whether it earns its cost.

Capture first; decide what to do with it once there is enough to be worth
deciding about.

---

## 7. `local` vs `hosted`

### 7.1 The problem

The intent — local replicates the single-tenant predecessor, hosted is
multi-tenant — is reasonable, but the implementation makes `mode` change the
**logical model**, not just physical placement. Roughly ten files branch on it,
including security-relevant ones:

- `lib/server/tenant/resource-store.ts:73` — which database backs the store
- `lib/server/tables/repository.ts:62` — reserved table names apply only in local
- `lib/server/tables/list-physical.ts:89`, `sync.ts:256` — table discovery differs
- `lib/server/workspace-apps.ts` — three branches

Consequences, both already in the defect register:

- Report queries can read across workspaces in local mode (**D-3**) *because*
  control plane and resource store are the same database.
- `lib/server/tables/postgres/create-table.ts` adds **no `workspace_id`** to user
  tables. In a shared database, two workspaces registering a table with the same
  name share its rows. `server/repositories/data.ts` scopes by `workspace_id`
  only "when the column happens to exist" — and it never does for user tables.

The second is the deeper one: it is not a bug in a query, it is an assumption
about single-tenancy baked into table creation.

### 7.2 The recommendation

Keep the physical flexibility. Remove the logical duality.

> **One logical model always: control plane + tenant plane.** `APP_MODE` becomes
> a *deployment* setting describing where those planes physically live —
> `single-database` (both point at one Postgres) or `split` (a database per
> tenant) — and changes **no** semantics.

Which requires:

- **Every user table gets `workspace_id`**, always, in both deployments.
- **Every query scopes by workspace**, always — not "when the column exists."
- Reserved table names apply in both, or in neither.

The payoff: single-database deployment becomes safe with multiple workspaces, the
security properties stop differing between modes, and an entire class of
"works in hosted, leaks in local" defect disappears. It also makes local mode a
truthful rehearsal for production, which it currently is not.

This does not cost the single-tenant story. A single-tenant deployment is just
one workspace in a single-database deployment — the predecessor was
single-tenant because it was 2010, not because single-tenancy needs a different
architecture.

**Gated on Q-5** (is local a supported deployment shape or dev-only?). If
dev-only, this drops in priority but the `workspace_id` fix still stands, because
it is what makes the shared-database deployment possible at all.

---

## 8. Findings

| # | Finding | Severity | Action |
| --- | --- | --- | --- |
| P-1 | `DATABASE_ARCHITECTURE.md` says pages/tables live in the resource store; they are control plane | **Doc defect** — misleading, could prompt a harmful "fix" | Corrected |
| P-2 | User tables have no `workspace_id`; shared-database tenancy is impossible by construction | **High** (gated on Q-5) | SPX-009 |
| P-3 | No telemetry plane; proposal/correction signal is uncapturable after the fact | **High, time-sensitive** | SPX-201 |
| P-4 | `agent_threads.state` holds conversation content in the control plane | Medium | Decide with Q-6 |
| P-5 | `mode` changes logical semantics in ~10 files | Medium | SPX-701 |
| P-6 | `event_logs.payload` / `audit_logs.changes` carry business data in the control plane | Medium — accepted for now | §4, document it |
| P-7 | Legacy chat in the resource store, agent threads in the control plane | Low | Resolve at legacy retirement |

---

## 9. Summary answers

**Is the storage model correct?** Structurally yes — config in the control plane
is the right call and is what makes the harvest loop possible. It needs a third
plane for derived signal, and the local/hosted split should become a deployment
choice rather than a logical one.

**Where do we separate user data from config?** Already separated: config in the
control plane, business records in the tenant plane. Hold that line — the
temptation to put config in the tenant plane "for isolation" would kill harvest.

**Where do chat threads go?** Content to the tenant plane (it may contain
anything). Trace to telemetry. Currently all in the control plane; worth
changing.

**Is this data useful for analysis or training?** The config and the interaction
around it — very. Customer business records — no, and taking them creates legal
exposure for no benefit. Build capture now; decide on fine-tuning later.

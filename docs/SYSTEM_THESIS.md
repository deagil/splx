# Splx — System Thesis and Intended Design

> **Status:** design intent. Written deliberately *without* reference to what is
> currently implemented, so that [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md)
> can be compared against it honestly. Where this document and the code disagree,
> this document describes the target and the review describes the present.
>
> Requirements are numbered `R-n` so the [development plan](./DEVELOPMENT_PLAN.md)
> can reference them.
>
> **2026-08-14:** R-17 split. A Form is a data definition (field projection).
> CRUD is HTTP through a Form. Workflows are process definitions, invoked with
> POST (sync on-demand; queued for event/timer). The fused RPC Contract
> (`POST /booking.create`) is rejected. See §3.

---

## 1. Thesis

### 1.1 What changed

The generation of config-driven system builders that emerged around 2010–2015
sold a single promise: **people who cannot write code can build software.** The
promise was real and the economics were excellent, because writing code was the
scarce input.

Writing code is no longer scarce. A competent person with an AI assistant
produces a working CRUD application in an afternoon. Any product whose entire
value is "you don't have to write this code" is now competing with something
free, faster, and more flexible than itself.

That kills the old pitch. It does not kill the category, because it moved the
scarcity somewhere else.

### 1.2 Where the scarcity moved

When generating a system is cheap, the expensive parts become:

| Scarce thing | Why AI made it worse, not better |
| --- | --- |
| **Reviewing** what a system does | Generated code is opaque to the people accountable for it. Volume went up; readership did not. |
| **Governing** who can do what | Generated code has whatever permission model the prompt happened to mention. |
| **Proving** what happened | Auditors, regulators and customers ask "what did the system do, under which rules, on 3 March?" Source control answers that for code, and nothing answers it for behaviour. |
| **Changing** it safely later | The second change to a generated codebase is far more expensive than the first. Bespoke code per client compounds into N codebases. |
| **Sharing** improvements across clients | N generated codebases share nothing. A fix is applied N times or not at all. |

### 1.3 The thesis

> **Splx is a runtime where every unit of business behaviour is a typed, named,
> versioned, permissioned, auditable object — authored by humans or AI, and
> reviewable by people who cannot read code.**

The visual editor is not the point. It is a *consequence* of the config being
typed. The point is the substrate.

Three commitments follow from this, and they are the ones to defend when
scope pressure arrives:

- **R-1 — Every executable behaviour is a declared object, not code.** If a
  change to business behaviour requires a deploy, the abstraction has failed for
  that behaviour. (Bounded by §4: not everything *should* be config.)
- **R-2 — Every object is versioned, and every execution records the version it
  ran.** "What rules applied to this transaction?" must be answerable from data.
- **R-3 — Everything a human can do, the AI can do, through the same interface,
  under the same permissions, producing the same audit record.** No privileged AI
  path, no separate AI API surface. The AI is a user with an unusual input method.

R-3 is what makes the post-AI version of this category coherent: the AI does the
authoring that non-coders used to do slowly, and the typed config gives the
non-coders something they can *read and approve* instead of code they cannot.

### 1.4 Who this is for

Deliberately narrow, in priority order:

1. **The operator-builder** — a person or small team delivering real systems to
   real clients, who needs each new client to cost weeks not quarters, and needs
   improvements made for one client to reach all of them.
2. **The client's back-office staff** — who need to *run* the system daily
   (queues, cases, records, actions), never to build it.
3. **The client's own analyst** — who eventually makes tier-3 changes (a new
   field, a new report, a changed email) without filing a ticket.

Explicitly **not** targeted: developers who would rather generate an app. They
are better served by AI writing code, and competing for them is a losing fight.

---

## 2. What "a system" actually is

### 2.0 Two layers, and why the distinction matters

There are two different questions hiding in "what are the primitives", and
conflating them produces a bad architecture:

| | Question | Answer lives in | Example |
| --- | --- | --- | --- |
| **Capability primitives** | What must the *platform* be able to do? | Code, shipped by release | "Invoke a function at a future time" |
| **Domain patterns** | What do *businesses* have? | Blueprints, config | "A dispute case with an SLA" |

**The platform must implement capabilities. It must not implement domain
patterns.** If `Case` were a platform table, then every business without cases
carries it, every business whose cases differ fights it, and the platform grows
a new table per vertical forever. That is how this category of product dies.

So the domain nouns below are used as a **derivation instrument, not as the
architecture**: each one is decomposed until it bottoms out in capabilities. A
noun that decomposes completely is a blueprint pattern. A noun that *cannot* be
decomposed has found a missing capability — and those are the interesting ones.

### 2.1 The domain nouns (the instrument)

Intersecting three concrete systems — **a bank's back office**, **an online
shop**, **a service business taking bookings**:

| # | Noun | Bank | Shop | Bookings |
| --- | --- | --- | --- | --- |
| 1 | **Party** | Account holder, beneficiary | Customer, supplier | Client, practitioner |
| 2 | **Agreement** | Account, loan, card | Subscription, trade account | Membership, package |
| 3 | **Resource** | Available balance, credit limit | Stock on hand | Staff time, room |
| 4 | **Transaction** | Posting | Order, payment, shipment | Appointment, attendance |
| 5 | **Position** | Balance | Inventory level | Calendar availability |
| 6 | **Case** | Dispute, arrears, onboarding | Return, chargeback | Reschedule, complaint |
| 7 | **Document** | Statement, agreement | Invoice, packing slip | Confirmation, waiver |
| 8 | **Message** | Notice, statement email | Order confirmation | Reminder, follow-up |
| 9 | **Schedule** | Interest accrual, EOD batch | Renewal, dunning | 24h reminder, recurrence |
| 10 | **Actor & Grant** | Four-eyes on release | Warehouse vs support | Practitioner sees own diary |

### 2.2 The decomposition

Reading each noun down to capabilities. `C-n` refers to §2.3.

| Noun | Decomposes into | Verdict |
| --- | --- | --- |
| Party | Persistence (C-1) + Form (C-2) + Query (C-12) | **Blueprint.** Nothing new. |
| Agreement | Persistence + **State machine (C-6)** + **Timers (C-5b)** | **Blueprint**, but surfaced C-6 and C-5b |
| Resource | **Allocation under concurrency (C-7)** | **Platform.** Does not decompose — see §2.4 |
| Transaction | Append-only persistence + C-7 + **Sequences (C-14)** | **Platform-backed**, surfaced C-14 |
| Position | Derived from C-7's log + **Computed values (C-13)** | **Platform-backed** |
| Case | Persistence + C-6 + C-5b + assignment (C-3) + audit (C-9) + query | **Blueprint.** Fully decomposes — surfaced C-6, C-5b |
| Document | **Render-to-artefact (C-10)** + **File storage (C-11)** + persistence | **Blueprint**, surfaced C-10, C-11 |
| Message | **Outbound comms (C-8)** + **consent (C-8b)** | **Blueprint**, surfaced C-8b |
| Schedule | **Time-triggered invocation (C-5a)** | **Platform.** Pure capability |
| Actor & Grant | **Identity (C-3)** + **Authorisation (C-4)** | **Platform.** Pure capability |

Seven of ten nouns are blueprint patterns. Three are platform capabilities. But
the seven were not wasted — decomposing them surfaced six capabilities that a
naive "what does a CRUD app need" list would have missed: state machines,
per-record timers, document rendering, sequences, computed values, and consent.

**To answer the question directly: `Case` informs the architecture by requiring
declared state machines and per-record timers, and by requiring nothing else.**
It is then built in a blueprint as an Entity with a state machine, an assignee
field, an SLA timer, and three Forms. It is never a platform table.

### 2.3 The capability primitives

This is the actual platform surface. It is closed — new verticals should add
blueprints, not capabilities.

**Data**
- **C-1 Persistence** — typed records, relationships, constraints, history.
- **C-2 Form** (also called Contract in earlier drafts) — declared field
  projection over persistence: types, validation, visibility, permission. See
  §3. *The load-bearing data definition.* It is not an operation.
- **C-13 Computed values** — derived fields and expressions, evaluated
  consistently wherever the Form is used.
- **C-14 Sequences** — unique, human-readable reference numbers (invoice
  numbers, case refs). Unglamorous; every system needs it; retrofitting gapless
  numbering is painful.

**Access**
- **C-3 Identity** — two realms: staff and customer (R-6).
- **C-4 Authorisation** — object, field, record, action scope (R-7), plus
  segregation of duties (R-8).

**Behaviour**
- **C-5 Invocation** — the five ways work starts. This is the capability the
  "functional primitives" instinct is really pointing at:
  - **C-5a Time-triggered** — cron, interval, or "at this datetime"
  - **C-5b Record timers** — "24h before `starts_at`", "7 days after status
    became `overdue`" — bound to a record, cancelled when it changes
  - **C-5c Event-triggered** — something changed, react
  - **C-5d Request-triggered** — user submits, or an external system calls in
  - **C-5e On-demand** — a human or the AI invokes a named process **now**.
    In-request, synchronous, under the caller's permissions. Not an enqueue.
- **C-6 State machines** — declared statuses, legal transitions, guards, and
  per-transition permissions on an Entity.
- **C-7 Allocation** — enforce invariants under concurrency. §2.4.
- **C-15 Durable execution** — multi-step orchestration with checkpointing,
  retry, compensation, dead-lettering (R-19 Tier 2).

**Boundary**
- **C-8 Outbound communication** — email/SMS/push, templated, with delivery
  record. **C-8b Consent and preferences** — legally required, and not
  retrofittable.
- **C-9 Audit and event log** — immutable, queryable, version-aware (R-9).
- **C-10 Document rendering** — template → retained artefact (PDF/HTML), linked
  to a record, versioned.
- **C-11 File storage** — upload, retain, serve under permission.
- **C-16 Connectors** — outbound calls and inbound webhooks with credentials,
  idempotency, retry, reconciliation (R-16).
- **C-12 Query** — list, filter, search, aggregate, report, with authorisation
  applied at the query (R-10).
- **C-17 Bulk data movement** — import and export of records (R-12).

**Lifecycle**
- **C-18 Configuration lifecycle** — version, provenance, package, install,
  upgrade, export (§5).
- **C-19 Observability** — per-tenant health, failure surfaces, DLQ (R-15).

> **R-4** — The platform implements exactly the capability set C-1…C-19. Domain
> patterns (Case, Order, Booking, Loan) are composed from them in blueprints and
> never added to the platform.

New requirements arising from the decomposition:

> **R-31** — Entities may declare a state machine: statuses, legal transitions,
> guard conditions, and the permission required for each transition (C-6).

> **R-32** — Timers may be attached to records, expressed relative to a field or
> a status change, and are automatically cancelled or rescheduled when the record
> changes (C-5b).

> **R-33** — Documents are generated from versioned templates into retained,
> immutable artefacts linked to their source record (C-10, C-11).

> **R-34** — The platform provides unique, configurable, human-readable sequence
> generation (C-14).

> **R-35** — Computed fields are declared once on the Form and evaluated
> identically in UI, API, and workflow contexts (C-13).

> **R-36** — Communication respects per-party consent and channel preferences,
> checked at send time, with an auditable record of the basis (C-8b).

### 2.4 The uncomfortable one: Resource

Primitives 3 and 5 are where systems actually fail, and they are the same
problem in all three domains:

- Two payments against one balance → **overdraft**
- Two orders against one unit of stock → **oversell**
- Two bookings against one 3pm slot → **double-booking**

This is a concurrency invariant, not a form. It cannot be expressed as
validation rules on a field, and it cannot be safely delegated to a
config-driven workflow that reads-then-writes. It requires a reservation or
ledger mechanism with real isolation guarantees.

> **R-5** — Allocation of finite resources is a platform-owned primitive with
> enforced invariants, not a pattern each blueprint reinvents in workflow steps.

This single requirement is what separates "a nice internal-tools builder" from
"can run a bank."

### 2.5 Cross-cutting requirements

Present in all three systems regardless of domain, and cutting across the
capabilities above:

- **R-6** Identity for two distinct realms: **staff** (SSO, roles, session
  policy) and **customers** (passwordless, self-service, far weaker trust). They
  are not the same auth system and conflating them is a security defect.
- **R-7** Authorisation at four scopes: *object* (may you see the Booking form),
  *field* (may you see `cost_price`), *record* (only rows for your branch), and
  *action* (may you release a payment).
- **R-8** Segregation of duties — maker/checker on designated actions. One human
  submits, a different human approves. Required for payments, refunds, credit
  limits, and any regulated action.
- **R-9** Audit — actor, action, before/after, request id, timestamp, and the
  **version of the rule** applied. Immutable, queryable, retained.
- **R-10** Search and list over any entity with authorisation applied at the
  query, not filtered in the UI after the fact.
- **R-11** Reporting and reconciliation — including reconciling internal
  position against an external system's position, which every one of the three
  domains needs (bank vs rail, shop vs PSP, bookings vs calendar).
- **R-12** Bulk import and export — onboarding data migration, regulator
  returns, warehouse sync. Never a one-off script.
- **R-13** Idempotency at every boundary — inbound webhook, outbound call,
  workflow step, and user-submitted form.
- **R-14** Environments — at minimum sandbox and production per client, with a
  defined promotion path for configuration.
- **R-15** Observability — per-tenant health, queue depth, failure rates, and a
  dead-letter surface a human actually looks at.

### 2.6 External systems that always appear

The specific vendors vary; the *shapes* do not.

| Shape | Bank | Shop | Bookings |
| --- | --- | --- | --- |
| Money in/out | Payment rail, card processor | PSP (Stripe/Adyen) | PSP, deposits |
| Identity & risk | KYC, AML/sanctions, credit bureau | Fraud scoring | ID check (light) |
| Ledger/finance | Core ledger, GL | Accounting (Xero/NetSuite) | Accounting |
| Comms | Email, SMS, secure message | Email, SMS | Email, SMS, push |
| Documents | Statement gen, e-sign | Invoice, labels | Confirmation, waiver e-sign |
| Scheduling | — | — | Google/Outlook calendar |
| Logistics | — | Carrier, tax (Avalara) | — |
| Staff identity | SSO/SAML | SSO | SSO |
| Data out | Regulatory returns, warehouse | Warehouse, BI | Warehouse |

Every one of these needs the same six mechanics: credential storage, a typed
connector definition, signed inbound webhooks with replay protection, outbound
calls with retry and idempotency keys, a periodic reconciliation job, and health
reporting.

> **R-16** — Integrations are instances of one **Connector** primitive providing
> those six mechanics. Adding a vendor is configuration plus a thin adapter, not
> a new subsystem.

---

## 3. The central primitive: the Form

A Form is a **data definition**. A Workflow is a **process definition**. They
are not the same object. Earlier drafts fused them into an RPC Contract
(`POST /booking.create`); that is rejected. The property worth keeping is
unchanged: one field definition, many consumers, nothing restated, nothing
drifts.

### 3.1 Two objects, four ways in

```
     Form (data)                         Workflow (process)
     field set, types,                   named, versioned steps
     validation, visibility              input typed by a Form

           │                                    │
     ┌─────┴──────┐                      ┌──────┴──────┐
     ▼            ▼                      ▼             ▼
  UI list/     HTTP CRUD              POST invoke    event / timer
  record       GET/POST/              (C-5e, sync,   (C-5a/c, durable
  block        PATCH/DELETE           caller auth)   queue, workspace
               through the Form                      authority)
```

The predecessor's insight was that a registered **form** (included/excluded
fields) was the shape used by the screen, the API, and the "submit form" step.
Operations were granted on that form by role. Special behaviour was a **process**,
not a second field set pretending to be a verb.

> **R-17** — A **Form** is a named, versioned field projection over an Entity:
> included fields, types, validation, visibility, and per-field permission. It
> is the data definition for UI, HTTP CRUD, and workflow inputs/outputs. It does
> not encode an HTTP verb or a process. There is exactly one field definition
> for a given projection; CRUD verbs are HTTP; non-CRUD behaviour is a Workflow.

> **R-17b** — CRUD uses standard HTTP on the Entity, applying a Form as the
> projection and validation. Non-CRUD behaviour is a Workflow, invoked with
> `POST`. On-demand and request-triggered starts (C-5d/e) execute **in-request**,
> synchronously, under the caller's permissions. Time- and event-triggered
> starts (C-5a/c) remain durable queued runs.

### 3.2 Shape

```jsonc
{
  "id": "booking.staff",
  "version": 4,
  "entity": "booking",
  "permission": "booking.staff",     // grant this to use the form
  "methods": ["GET", "POST", "PATCH"], // HTTP verbs this form may serve
  "fields": [
    { "name": "client_id",   "source": "column:client_id", "type": "reference",
      "entity": "party", "required": true, "label": "Client" },
    { "name": "starts_at",   "source": "column:starts_at", "type": "datetime",
      "required": true, "validation": { "notInPast": true } },
    { "name": "duration",    "source": "column:duration_minutes", "type": "integer",
      "validation": { "min": 15, "max": 480 } },
    { "name": "practitioner","source": "column:practitioner_id", "type": "reference",
      "entity": "staff", "visibleTo": ["role:admin", "role:scheduler"] },
    { "name": "total",       "source": "computed:booking.price", "type": "money",
      "readOnly": true }
  ]
}
```

HTTP (one generic resource surface; the Form is selected, not encoded in the
path):

```
GET    /api/v1/entities/booking              ?form=booking.staff
POST   /api/v1/entities/booking              ?form=booking.staff
GET    /api/v1/entities/booking/:id          ?form=booking.staff
PATCH  /api/v1/entities/booking/:id          ?form=booking.staff
DELETE /api/v1/entities/booking/:id          ?form=booking.staff

POST   /api/v1/workflows/booking.reschedule/run
       { "form": "booking.reschedule_input", "input": { ... } }
```

`booking.reschedule` is a Workflow. Its start payload is typed by a Form
(`booking.reschedule_input` — a projection, possibly a subset of the entity).
The run is synchronous when a user, the AI, or an inbound request invokes it.
A Trigger block is the same POST. After the business commit returns, comms and
connectors may continue as durable tail steps or as a separate event-triggered
workflow.

Key properties:

- **`source` distinguishes stored from computed.** A field is a column, a
  computed expression, or a related lookup. That is what lets many Forms sit
  over one table with different field sets (`booking.staff`, `booking.customer`).
- **Many Forms per Entity is normal.** They differ by who may see which fields,
  not by inventing a new verb. Create and update share `booking.staff`; they
  are `POST` vs `PATCH`, not two cloned objects.
- **The Entity is the API resource.** `POST /entities/booking` exists because
  the entity exists. The Form is the projection applied to that request. No
  per-resource route is hand-written; no `POST /booking.create` RPC.
- **Field-level permission lives on the Form** (R-7), which is what makes a
  read-only back-office view a *configuration*, not a second application.
- **Workflow write steps apply a Form** — the same validation and field strip
  as HTTP. Raw `row` against a table is an admin-only bypass.
- **Optional write hooks** (`reserves`, `emits`) may sit on a Form used for
  POST/PATCH so create can reserve a slot in the same transaction (R-5). They
  are not a reason to fuse the verb into the Form's identity.

> **R-18** — Entities (storage) and Forms (interface) are separate objects
> with independent lifecycles. Storage schema changes are migrations; interface
> changes are config edits. Workflows (process) are a third object; they
> reference Forms, they are not Forms.

### 3.3 Why this matters more now, not less

With R-3 (AI does everything a user can), Forms and Workflows are the AI's
tool surface. An AI that edits typed Forms and process definitions is
constrained by the type system, checkable by diff, and reviewable by a
non-coder. An AI that writes route handlers is constrained by nothing and
reviewable by nobody in the target audience.

**The Form is what makes AI authoring of data shapes safe. The Workflow is
what makes AI authoring of behaviour safe. Fusing them makes both worse.**

---

## 4. Three tiers of correctness

The most common failure of config-driven platforms is treating all behaviour as
equally suitable for configuration. Money and stock are not email templates.

> **R-19** — Every behaviour is assigned to exactly one tier, and the tier
> determines what may be configured and what guarantees apply.

### Tier 1 — System of record

**What:** ledger postings, balances, stock reservation, slot allocation,
idempotency keys, immutable transaction log.

**Guarantees:** serialisable or explicitly-reasoned isolation; enforced
invariants (double-entry balances, no negative stock, no overlapping slot);
append-only; exactly-once effects.

**Configured?** No. This is **code**, small, heavily tested, changed by deploy.
Configuration *selects and parameterises* Tier 1 behaviour (a product definition
says "interest accrues daily, 365-day basis"), it never implements it.

**Rule of thumb:** if getting it wrong twice produces a duplicate payment, a
negative balance, or a double-booked room, it is Tier 1.

### Tier 2 — Orchestration

**What:** workflows, integrations, comms, case routing, scheduled jobs,
approvals.

**Guarantees:** durable execution; **step-level** checkpointing so a retry
resumes rather than restarts; idempotency keys on every external effect;
versioned definitions pinned per run; compensation for the steps that need it;
dead-letter with human recovery.

**Configured?** Yes — this is the heart of the product. Tier 2 calls Tier 1 for
anything that must be exact.

### Tier 3 — Presentation and operations

**What:** Forms' display concerns, pages, lists, dashboards, navigation,
report definitions, email copy, labels.

**Guarantees:** none needed beyond authorisation being applied server-side.

**Configured?** Entirely. Fully AI-authorable. Changes are cheap and reversible.

### Why this resolves the banking question

The predecessor ran a bank with payments in Tier 2 and no Tier 1 — it worked
because a decade of hardening, a single contract, and a lot of careful human
process filled the gap. The modern reference architecture (Thought Machine
Vault, and to a lesser degree Mambu/10x) does the opposite: a small,
correctness-guaranteed ledger core with *versioned product definitions* on top,
orchestrated by a workflow layer.

> **R-20** — Splx's workflow engine is an orchestration layer that may *drive* a
> ledger. It must never *be* the ledger.

---

## 5. Configuration model

This section answers directly: *how does the predecessor's git-committed config
translate to multi-tenancy?*

### 5.1 The diagnosis

The predecessor's model worked because it was effectively **single-tenant with a
shared upstream**: one repo per deployment, config edited locally, diffed,
committed. Multi-tenancy breaks this because a tenant is not a checkout and
clients will not operate git.

The instinct to move to database config was **correct**. What was lost in the
move is not *files* — it is the three things git was incidentally providing:

1. **Provenance** — where did this object come from?
2. **Versioning** — which revision is this, and what changed?
3. **Merge** — how do upstream improvements reach a customised deployment?

Restore those three as first-class data and the file question dissolves. Files
become an *export format*, not the storage model.

### 5.2 Three layers

```
┌──────────────────────────────────────────────────────────┐
│ PLATFORM        in git, in this repo, shipped by release  │
│ action catalog · field types · block types · Tier-1 rules │
│ permission vocabulary · connector adapters                │
└──────────────────────────────────────────────────────────┘
                            │  consumed by
┌──────────────────────────────────────────────────────────┐
│ BLUEPRINT       versioned package, published to registry  │
│ entities · contracts · workflows · pages · roles ·        │
│ email templates · seed data     e.g. bookings@2.3.0       │
└──────────────────────────────────────────────────────────┘
                            │  installed into
┌──────────────────────────────────────────────────────────┐
│ TENANT          rows in the control plane, per workspace  │
│ installed blueprint refs + local additions + overrides    │
│ every object carries provenance                           │
└──────────────────────────────────────────────────────────┘
```

> **R-21** — A **Blueprint** is a semantically versioned, installable package of
> configuration. Installing one into a workspace materialises its objects as
> tenant config with provenance recorded.

> **R-22** — Every tenant config object records `origin` (`blueprint:bookings@2.3.0`
> or `local`), the upstream revision it derives from, and whether it has been
> locally modified.

### 5.3 What a blueprint actually is

**A blueprint is the unit of independent versioning and installation.** Not a
fixed size. Both "the entire e-commerce system" and "payments" are blueprints —
one depends on the other.

#### Two tests for the boundary

When deciding whether something is its own blueprint or part of a larger one:

1. **Do I want to version and release it independently?** If payments improves,
   should bookings clients get that improvement without a bookings release? Yes →
   separate blueprint. If it only ever changes when the vertical changes, it is
   part of the vertical.
2. **Does it stand alone, or does it need a host?** A blueprint that installs and
   immediately does something useful is a **vertical**. One that only makes sense
   attached to something else is a **module** — a dependency, not a standalone
   install.

The floor: a single table or a single workflow is **not** a blueprint. Those are
objects *within* one. The smallest sensible blueprint is a coherent capability
with its own release cycle.

#### The layer cake

```
┌────────────────────────────────────────────────────────────┐
│ PLATFORM                    code, this repo, C-1…C-19       │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ MODULES (horizontal blueprints)   reusable across verticals │
│ parties · payments · comms · documents · approvals · kyc    │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ VERTICALS (blueprints)      compose modules + domain logic  │
│ bookings · ecommerce · lending                              │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ CLIENT OVERLAY              local deltas, usually unpublished│
└────────────────────────────────────────────────────────────┘
```

A fifth case exists and is worth naming: a **client blueprint**. A franchise or
multi-brand group whose customisation is installed into many workspaces publishes
their overlay as a blueprint of their own. Same machinery.

#### Worked example: e-commerce

```jsonc
// ecommerce@1.0.0 — manifest
{
  "id": "ecommerce",
  "version": "1.0.0",
  "platform": ">=3.2 <4",
  "dependencies": {
    "parties":   "^2.1",   // customer, address, contact
    "payments":  "^1.4",   // payment method, transaction, refund, PSP connector
    "comms":     "^1.0",   // consent, preferences, templates
    "documents": "^1.2"    // invoice + receipt rendering
  },
  "provides": {
    "entities":  ["product", "variant", "inventory_item", "cart",
                  "order", "order_line", "shipment", "return"],
    "contracts": 26,
    "workflows": ["order.lifecycle", "abandoned_cart", "dunning",
                  "fulfilment", "returns"],
    "pages":     ["catalog", "order_queue", "returns_queue", "stock"],
    "roles":     ["merchandiser", "warehouse", "support"]
  }
}
```

So the answer to the question directly: **the whole e-commerce system is a
blueprint, and it is mostly composed of smaller ones.** `payments` contributes
its three or four tables plus the connector config, reconciliation workflow, and
refund contracts — and `bookings` and `lending` install the same module rather
than each inventing their own payment tables.

That last property is the point of modules. Without them, three verticals means
three incompatible payment implementations and a fix applied three times.

#### Namespacing and collision

Object ids are namespaced by their owning blueprint — `payments.transaction`,
`ecommerce.order`, `parties.customer`. Two blueprints cannot silently define the
same object, and a tenant can see where anything came from. This is also what
makes renames tractable: ids are stable and independent of display names.

Where two verticals genuinely need the same concept, they **depend on a shared
module** rather than each defining it. Deciding that `parties.customer` is that
shared concept is design work, and getting it wrong is expensive — which leads
directly to the next point.

#### The discipline: start flat

Composition is powerful and it is also a trap. Dependency resolution, version
ranges, diamond dependencies, and compatibility testing are a large tooling
investment, and npm only works because an enormous amount of it exists.

> **R-38** — The first blueprints are **flat verticals with no dependencies**.
> Modules are extracted only when duplication across two or more shipped
> verticals proves where the boundary is.

Building the module system before there is a second consumer guarantees the
boundary is drawn in the wrong place. The extraction sequence mirrors the harvest
loop one level up:

| Stage | What you have | What you extract |
| --- | --- | --- |
| Clients 1–3 | One flat vertical, client overlays | Client work → the vertical (Loop D) |
| Second vertical | Two flat verticals, visible duplication | Duplication → modules |
| Third vertical | Modules + thin verticals | Refine module boundaries |

### 5.4 Upgrade as three-way merge

With R-22, upgrading `bookings@2.3.0 → 2.4.0` is a structured three-way merge —
the same algorithm as a git merge, but over typed objects rather than text, which
makes it **more** reliable than the predecessor's approach, not less:

| Object state | Action |
| --- | --- |
| Unmodified locally | Fast-forward silently |
| Modified locally, unchanged upstream | Keep local |
| Modified locally, changed upstream | Present a field-level diff for decision |
| Deleted upstream, unmodified locally | Remove |
| Locally created | Untouched |

This is the mechanism that gives back *"one core system, improvements shared
across every client, customisation preserved."* It is the single most important
architectural idea in this document after the Form.

> **R-23** — Blueprint upgrade is a reviewable, field-level, reversible merge with
> a dry-run that reports conflicts before anything is written.

### 5.5 Files, git, and environments

Files return as **projections**, on demand:

- **R-24** — A workspace's configuration can be exported to a deterministic,
  human-readable file tree (stable key ordering, one object per file) and
  re-imported. Byte-identical for an unchanged workspace, so `git diff` is
  meaningful.

That gives, without forcing git on anyone:

- Blueprints authored as files in a repo, published to the registry (your
  workflow — unchanged from what you liked before).
- Clients who want config in their own repo: export on a schedule, commit.
- **R-25** — Sandbox → production promotion is "install the same blueprint
  version, then apply this reviewed config diff." Same machinery as upgrade.
- Disaster recovery and tenant migration for free.

### 5.6 Consequence for the business model

This is what turns the agency treadmill into leverage:

| | Agency (predecessor) | Blueprint model |
| --- | --- | --- |
| New client cost | Full discovery + build | Install blueprint + configure delta |
| Improvement reaches | One client | Every client on that blueprint |
| Revenue scales with | Headcount | Blueprints × clients |
| Who makes tier-3 changes | You | The client's own staff, via UI + AI |

You are unlikely to go from services to pure self-serve in one step, and you
should not try. The realistic path is **product with implementation attached**,
where the blueprint does 80% and shrinking implementation hours raise revenue
per person. Self-serve becomes viable per-vertical, once a blueprint is mature
enough that install-and-configure needs no expert.

**On building it for yourself first:** that is the correct sequencing, not a
consolation prize. You are user #1, your own delivery work is the forcing
function that reveals which primitives are real, and every platform of this kind
was built to solve its author's delivery problem first. The only trap is letting
the tenant boundary go soft because there is only one tenant — R-21/R-22 must be
honest from the start, because retrofitting provenance onto config that never
had it is brutal.

---

## 6. Personas and the UI model

> **R-26** — Builder, operator, and customer interfaces are the **same renderer**
> driven by different capability grants — never separate applications.

| Persona | Sees | Needs |
| --- | --- | --- |
| **Builder** | Everything, plus editing chrome | Grid editor, Form editor, workflow editor, blueprint management |
| **Operator** (back office) | Granted pages only; no editing chrome | Queues, record views, actions they may run, search, their cases |
| **Customer** (portal, later) | Only their own records | A handful of Forms, separate auth realm (R-6) |

The operator UI is the same page renderer with `forms.edit` absent. This is
only possible if:

- Forms carry field-level visibility (R-17) — so "read-only view without
  cost price" is config, not a bespoke screen.
- Authorisation is record-scoped (R-7) — so "only my branch's bookings" is
  enforced in the query.
- Actions are declared workflows — so a trigger button appears only if the
  operator may run that process.

Which is to say: **the back-office requirement is the thing that forces the
Form object to exist.** It cannot be bolted on afterwards.

> **R-27** — Operators get a **work-centric** home (my queue, my cases, what needs
> approval) rather than the builder's object-centric navigation. Same components,
> different entry point.

---

## 7. Reference architecture

```
┌───────────────────────────────────────────────────────────────┐
│  CONTROL PLANE (shared, one database)                          │
│  identity · workspaces · roles & grants · forms · entities     │
│  workflows (versioned) · blueprints & installs · connectors    │
│  audit log · event log · schedule queue · run history          │
└───────────────────────────────────────────────────────────────┘
        │                    │                      │
        ▼                    ▼                      ▼
┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ TENANT DATA    │  │ EXECUTION        │  │ LEDGER (Tier 1)    │
│ PLANE          │  │ workers, durable │  │ postings, balances │
│ isolated DB    │  │ step checkpoints │  │ reservations       │
│ per tenant     │  │ retries, DLQ     │  │ invariant-enforced │
└────────────────┘  └──────────────────┘  └────────────────────┘
        │                    │                      │
        └────────────────────┴──────────────────────┘
                             ▼
                  ┌────────────────────┐
                  │ CONNECTORS (R-16)  │
                  │ PSP · KYC · email  │
                  │ calendar · SSO     │
                  └────────────────────┘
```

Notes on scale:

- **R-28** — Workers are horizontally scalable and independent of the web tier.
  In-process execution triggered by web requests is a development affordance, not
  an architecture.
- **R-29** — Connection acquisition is pooled per tenant, not per operation.
- **R-30** — Noisy-neighbour isolation: per-tenant concurrency limits and queue
  fairness, so one tenant's batch cannot starve another's interactive work.

---

## 8. Non-goals

Stating these prevents drift:

- **Not a general-purpose app builder.** No arbitrary UI composition. Blocks are
  a closed, curated set. Curation is the product.
- **Not a code generator.** Config is interpreted at runtime, not compiled to a
  codebase the client then owns. That would recreate the N-codebases problem.
- **Not a replacement for a specialist core ledger.** For a real bank, Tier 1 is
  either a small purpose-built ledger or a vendor. Splx orchestrates it (R-20).
- **Not a developer tool.** Developers should generate code. See §1.4.
- **No AI-only capability.** Anything the AI can do must be doable through the UI
  (R-3), or it becomes unreviewable.

---

## 9. Worked mappings

Sanity-checking the primitives against the three reference systems.

### 9.1 Lender / bank back office

| Primitive | Instance | Tier |
| --- | --- | --- |
| Party | Customer, with KYC state and sanctions screening result | 3 |
| Agreement | Loan account: product ref, rate, term, schedule | 1 (definition), 3 (display) |
| Resource | Available credit, available balance | **1** |
| Transaction | Posting (double-entry, immutable) | **1** |
| Position | Balance, arrears bucket | **1** |
| Case | Onboarding, arrears, dispute — assigned, SLA'd | 2 |
| Document | Statement, agreement, notice | 2 |
| Message | Statement email, arrears notice | 2 |
| Schedule | Daily accrual, monthly statement, EOD reconcile | 2 driving 1 |
| Grant | Maker/checker on payment release (R-8) | 3 |

Feasible **only** with Tier 1 present. Splx's role is Forms, cases,
workflows, comms, back office, and reconciliation on top of a ledger.

### 9.2 Online shop

| Primitive | Instance | Tier |
| --- | --- | --- |
| Party | Customer, supplier | 3 |
| Agreement | Subscription, trade account terms | 3 |
| Resource | Stock on hand, reservation on checkout | **1** |
| Transaction | Order, payment (auth/capture), shipment | 1 (money/stock), 2 (fulfilment) |
| Position | Inventory level, PSP settlement balance | **1** |
| Case | Return, chargeback, support ticket | 2 |
| Document | Invoice, packing slip, credit note | 2 |
| Schedule | Abandoned cart, renewal, dunning | 2 |

Fully achievable. Overselling is the Tier 1 requirement.

### 9.3 Bookings / service business

| Primitive | Instance | Tier |
| --- | --- | --- |
| Party | Client, practitioner | 3 |
| Agreement | Package of 10 sessions, membership | 3 + balance in 1 |
| Resource | Practitioner-hour, room | **1** |
| Transaction | Booking, attendance, deposit payment | 1 (slot + money), 2 (rest) |
| Position | Calendar availability, sessions remaining | **1** |
| Case | Reschedule request, complaint | 2 |
| Schedule | 24h reminder, no-show follow-up, recurrence | 2 |
| Grant | Practitioner sees own diary only (record-scoped, R-7) | 3 |

The most tractable first vertical: real Tier 1 requirement (slots) but small,
short feedback loops, and integrations limited to calendar + PSP + comms.

---

## 10. Requirements index

| # | Requirement | Tier / area |
| --- | --- | --- |
| R-1 | Behaviour is declared objects, not code | Thesis |
| R-2 | Objects versioned; executions record version | Thesis |
| R-3 | AI has parity with human users, same permissions and audit | Thesis |
| R-4 | Platform implements capabilities C-1…C-19; domain patterns live in blueprints | Model |
| R-5 | Finite-resource allocation is a platform primitive | **Tier 1** |
| R-6 | Separate staff and customer auth realms | Access |
| R-7 | Authorisation at object, field, record, and action scope | Access |
| R-8 | Segregation of duties / maker-checker | Access |
| R-9 | Audit includes the rule version applied | Audit |
| R-10 | Authorisation applied at query, not in UI | Access |
| R-11 | Reporting and external reconciliation | Ops |
| R-12 | Bulk import/export as a product feature | Ops |
| R-13 | Idempotency at every boundary | Tier 1/2 |
| R-14 | Sandbox and production environments per client | Config |
| R-15 | Per-tenant observability and dead-letter surface | Ops |
| R-16 | One Connector primitive with six mechanics | Integration |
| R-17 | **Form** — named field projection; CRUD is HTTP; processes are workflows | **Core** |
| R-17b | On-demand workflow invoke is sync and caller-scoped; event/timer stay queued | Core |
| R-18 | Entity, Form, and Workflow are separate objects | Core |
| R-19 | Every behaviour assigned to a correctness tier | Core |
| R-20 | Workflow engine drives a ledger, never is one | Tier 1 |
| R-21 | Blueprint — versioned installable config package | **Config** |
| R-22 | Provenance on every tenant config object | **Config** |
| R-23 | Blueprint upgrade is a reviewable three-way merge | Config |
| R-24 | Deterministic config export/import to files | Config |
| R-25 | Environment promotion via blueprint + reviewed diff | Config |
| R-26 | Builder/operator/customer share one renderer | UI |
| R-27 | Operators get work-centric navigation | UI |
| R-28 | Workers scale independently of the web tier | Scale |
| R-29 | Pooled connections per tenant | Scale |
| R-30 | Per-tenant concurrency limits and queue fairness | Scale |
| R-31 | Declared state machines on entities | C-6 |
| R-32 | Record-bound timers, auto-cancelled on change | C-5b |
| R-33 | Document rendering to retained artefacts | C-10/11 |
| R-34 | Human-readable sequence generation | C-14 |
| R-35 | Computed fields declared once, evaluated everywhere | C-13 |
| R-36 | Consent and channel preferences checked at send | C-8b |
| R-37 | Fleet view: cross-tenant config drift and override visibility | Config |
| R-38 | First blueprints are flat verticals; modules extracted only on proven duplication | Config |

> **R-37** — The platform surfaces, across all tenants, which config objects have
> been locally modified and how. Without it the harvest loop
> ([DELIVERY_LIFECYCLE.md](./DELIVERY_LIFECYCLE.md) §Loop D) — the mechanism that
> turns per-client work into product — cannot be operated.

---

## 11. How to use this document

- New feature? Identify its **tier** (§4) and its **primitive** (§2.1) before
  designing. If it is neither, question whether it belongs in the platform or in
  a blueprint.
- Tempted to hand-write an API route? That is a missing Form (R-17) or a
  missing Workflow invoke (R-17b).
- Tempted to add a per-client code path? That is a missing Blueprint (R-21).
- Tempted to put money or stock logic in a workflow step? That is Tier 1 (R-19,
  R-20).

See [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md) for where the
implementation currently stands against this, and
[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for the route between them.

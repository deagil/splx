# Splx — Delivery Lifecycle

> How a client goes from first conversation to a running system, and the
> repeating loops that follow. Companion to [SYSTEM_THESIS.md](./SYSTEM_THESIS.md)
> (what the platform must provide) and [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)
> (when it gets built).
>
> Running example: a **bookings / service business** vertical.

---

## 1. Blueprints, and what happened to git

Before the loops make sense, this needs settling — it is the mechanism
everything below runs on.

### 1.1 What git was actually giving you

In the predecessor system, config lived in files and git provided four things.
They are separable, and it is worth naming them individually:

| Property | What it meant in practice |
| --- | --- |
| **History** | Every previous version retained and recoverable |
| **Diff** | "What changed between these two versions?" |
| **Merge** | "Combine upstream improvements with my local changes" |
| **Distribution** | "Push my improvements up, pull yours down" |

Git implements these **generically, over unstructured text**. That generality is
the whole point of git — it knows nothing about your data, so it works for
anything. The cost of that generality is that it operates on lines, and lines
are not the unit your config is actually made of.

### 1.2 Why you don't need git for tenant config

Once configuration is **typed objects** rather than text files, all four
properties can be implemented directly — and each one comes out *better*, because
the system knows the structure:

| Property | Git (text) | Splx (typed objects) |
| --- | --- | --- |
| History | Commits over file contents | Version rows per object; `workflow@7` is addressable |
| Diff | Line-based. "Line 42 changed" | Field-level and semantic: *"field `email`: `required` false → true"* |
| Merge | Three-way over lines. **Can produce a syntactically invalid file** — a conflicted XML config that no longer parses | Three-way over fields. **Cannot produce an invalid object** — every merge outcome is a valid Form |
| Distribution | push / pull / remotes | Blueprint publish / install / upgrade |

The line-based merge point is the important one. When your predecessor's XML
config hit a merge conflict, the result was a broken file that a human had to
repair by hand, and a mistake there produced a system that failed at runtime. A
field-level merge over typed objects has no such failure mode: worst case, it
asks which of two valid values you want.

**So blueprints don't replace git by being a better git. They make git
unnecessary *on the tenant path* by implementing the four properties natively
over structured data.**

### 1.3 The analogy that makes it click

`blueprint : tenant workspace` is the same relationship as:

- `npm package : application`
- `Salesforce managed package : org` ← the closest prior art, and it solves
  exactly this problem: versioned config packages installed into customer orgs,
  with local customisation preserved across upgrades
- `WordPress theme : site`

You author an npm package in git. Consumers install a version. They configure and
extend it locally. When you publish a new version they upgrade, and their local
extensions survive. **Nobody expects npm consumers to git-merge your library
source** — that would be absurd, and it is exactly what per-tenant git would be.

### 1.4 Where git remains

Git does not disappear. It moves to where it is good:

| Layer | Storage | Git? |
| --- | --- | --- |
| **Platform** | This repository | **Yes** — normal software development |
| **Blueprint authoring** | Your blueprint repo, exported config as files | **Yes** — you are a developer working on files, which is git's home ground |
| **Blueprint distribution** | Registry (versioned artefacts) | No — publish/install |
| **Tenant config** | Control-plane rows, with provenance | No — but exportable to files (R-24) on demand |

So your own authoring workflow is *unchanged from the thing you liked*: edit
config, diff it, commit it, review it. What changed is that clients receive
**versioned releases** instead of sharing your working tree.

### 1.5 What an upgrade actually looks like

Concretely, when you publish `bookings@2.4.0` and a client on `2.3.0` upgrades:

```
Upgrade bookings 2.3.0 → 2.4.0                        [ Dry run ]

  ✓  12 objects fast-forward (unmodified locally)
  ✓   3 objects kept (local-only, not in blueprint)
  ✓   1 object removed upstream, unmodified locally → remove

  ⚠  1 conflict needs a decision:

     Form  booking.staff
       field `deposit_amount`
         yours     required: false,  min: 0
         2.4.0     required: true,   min: 2500
       ( ) keep mine   ( ) take theirs   ( ) merge: required from theirs, min from mine

  ⚠  1 storage migration:
     Entity `booking` gains column `deposit_reference` (nullable) — safe
```

Reviewable, reversible, and comprehensible to someone who cannot read code.
That last property is the thesis in miniature.

### 1.6 Honest limits

Not everything is a clean merge, and pretending otherwise would set up a failure:

- **Storage changes are migrations, not merges.** A blueprint that adds a
  required column to an entity needs a data migration with a backfill strategy.
  Blueprints must be able to ship migrations, and those must be forward-only and
  tested.
- **Renames look like delete + create** unless objects carry stable ids
  independent of their names. They must — this is a schema decision to get right
  in Phase 1, not later.
- **Deletion is dangerous.** Removing an object a tenant has locally referenced
  must warn, not cascade.
- **Divergence is possible.** A client who rewrites half a blueprint has
  effectively forked. The fleet view (R-37) exists so you can see that happening
  and decide — generalise it into the blueprint, or accept the fork and price it.

---

## 2. The five loops

```
   ┌──────────────────────────────────────────────────────────────┐
   │                                                              │
   │   LOOP E — PLATFORM              (you, continuous)           │
   │   new capabilities, fixes, security → all tenants at once    │
   │                                                              │
   │   ┌──────────────────────────────────────────────────────┐   │
   │   │  LOOP D — HARVEST            (you, monthly)           │   │
   │   │  client-specific work → generalised → blueprint       │   │
   │   │  release → every client        ◄── the economic engine│   │
   │   │                                                       │   │
   │   │   ┌───────────────────────────────────────────────┐   │   │
   │   │   │ LOOP A — DELIVERY     (you + client, weeks)    │   │   │
   │   │   │ qualify → install → configure delta → go live  │   │   │
   │   │   └───────────────────────────────────────────────┘   │   │
   │   │   ┌───────────────────────────────────────────────┐   │   │
   │   │   │ LOOP C — CHANGE       (client or you, weekly)  │   │   │
   │   │   │ small config changes, versioned and reversible │   │   │
   │   │   └───────────────────────────────────────────────┘   │   │
   │   │   ┌───────────────────────────────────────────────┐   │   │
   │   │   │ LOOP B — OPERATE      (client staff, daily)    │   │   │
   │   │   │ queues, records, actions, approvals            │   │   │
   │   │   └───────────────────────────────────────────────┘   │   │
   │   └──────────────────────────────────────────────────────┘   │
   └──────────────────────────────────────────────────────────────┘
```

The nesting is the point: inner loops run fast and often without you; outer
loops run slowly and are where leverage accumulates.

---

## 3. Loop A — Delivery

**Trigger:** a new client. **Duration target:** 2–4 weeks. **Who:** you, plus
the client's project lead.

### A1 · Qualify (½ day)

Does an existing blueprint fit?

- **Yes, with configuration** → normal delivery, price as product + setup.
- **Yes, with a significant extension** → delivery plus a blueprint contribution;
  the extension is built *generally* and harvested (Loop D). Price accordingly.
- **No blueprint fits** → this is a **new blueprint project**. Different
  economics, longer, priced as such. Do this deliberately, only for a vertical
  you intend to sell repeatedly.

The single most valuable discipline in this whole document: **know which of the
three you are in before you quote.** The predecessor's margin problem was
partly that every project was silently the third one.

### A2 · Provision (1 hour, automated)

Create the workspace, choose region, provision the tenant database, create the
**sandbox** environment. Production is created but empty until A10.

*Requires:* R-14 (environments), existing multi-tenant provisioning.

### A3 · Install the blueprint (minutes)

```
install bookings@2.3.0 → acme-clinic (sandbox)
  entities        6    contracts      19    workflows   11
  pages           9    roles           4    templates    7
  seed data     ref data: appointment types, cancellation reasons
```

**The client now has a working system.** Not a scaffold, not a demo — a running
booking system with a back office, reminders, and payment capture.

This step is the entire reason the economics change, and it is worth being
explicit about why: everything after this is *differential*.

*Requires:* R-21 (blueprints), R-22 (provenance).

### A4 · Differential discovery (2–5 days)

Do **not** run blank-page requirements gathering. Sit with the client in front of
the running blueprint and capture deltas:

> "We call them *appointments*, not bookings." → label override
> "We take a 25% deposit." → new field + workflow step + PSP config
> "Two locations, staff only see their own." → record-scoped grant
> "Cancellation within 24h forfeits the deposit." → workflow rule
> "Our confirmation email must include the parking instructions." → template edit

This inverts the hardest part of the old agency model. Eliciting requirements in
the abstract is slow and produces misunderstandings that surface at UAT.
Reacting to something concrete is fast and produces precise deltas. Non-technical
stakeholders are *far* better at "that's wrong, it should do X" than at "describe
your process."

**Output:** a delta list, each item tagged tier 1/2/3 (thesis §4) and
blueprint-worthy or client-specific.

### A5 · Configure the delta (3–10 days)

Work down the delta list. Most items are tier 3 — Form fields, labels, page
layouts, email copy — and are minutes each. Tier 2 items (new workflow steps,
new integrations) are hours. Tier 1 items should be rare; if you have several,
A1 was wrong.

Every change is recorded with provenance as a local override on top of the
installed blueprint (R-22). This is what makes A4–A5 harvestable later.

**This is where the AI does the work** (R-3): describe the delta, the AI drafts
the Form or workflow change, you review the diff and approve. The client
watches, and increasingly does it themselves — which is the beginning of Loop C.

### A6 · Connect the outside world (1–3 days)

PSP, calendar, email domain and DNS, SMS, SSO. Each is a Connector instance
(R-16): credentials stored encrypted, webhooks verified, reconciliation job
scheduled.

*Requires:* R-16, C-16.

### A7 · Migrate data (2–5 days, highly variable)

Bulk import of existing clients, historical bookings, outstanding balances.
Almost always the least predictable step, because source data is always worse
than described.

Reconcile: counts, totals, spot checks. Keep the import reversible until sign-off.

*Requires:* R-12 (bulk import/export).

### A8 · Roles, users, and scopes (1 day)

Map the client's org chart onto roles. Configure record-scoped grants
("practitioner sees own diary", "location manager sees their location"). Set up
maker-checker on refunds if the client wants it.

*Requires:* R-7, R-8.

### A9 · UAT (1–2 weeks, client-led)

Client staff use the sandbox with migrated data. Findings loop back to A5.
Expect two or three rounds. This is where the differential approach pays off
again — findings are specific and small, not "this isn't what we meant."

### A10 · Promote to production (½ day)

```
promote acme-clinic: sandbox → production
  install  bookings@2.3.0                    ✓
  apply    47 local config changes (reviewed) ✓
  migrate  production data import             ✓
  connect  live PSP keys, live email domain   ✓
```

Same machinery as a blueprint upgrade (R-25), because it is the same problem:
apply a reviewed set of config changes to a target workspace.

### A11 · Train and hand over (2 days)

Operator UI training — the work-centric home (R-27), queues, actions, approvals.
Then the *change* training that starts Loop C: how to add a field, edit an email,
read a diff, approve an AI-drafted change.

**Exit:** the client runs Loop B daily without you.

---

## 4. Loop B — Operate

**Frequency:** continuous. **Who:** the client's back-office staff. **Your
involvement:** none, by design.

A day in the life:

- Receptionist opens the work-centric home: today's arrivals, unconfirmed
  bookings, deposits outstanding.
- A booking is taken over the phone through `POST /entities/booking?form=booking.staff`
  — which validates, reserves the slot (C-7), takes the deposit via the PSP
  connector, and emits `booking.created`.
- That event triggers a workflow: confirmation email, calendar sync, a record
  timer set for 24h before the appointment (C-5b).
- A cancellation inside 24h moves the booking's state machine (C-6) to
  `cancelled_late`, which a workflow picks up to forfeit the deposit — and
  because forfeiture is money, it posts through the ledger (Tier 1), not a
  workflow step.
- A refund above a threshold requires approval; the manager sees it in
  "awaiting my approval" and releases it (R-8).
- Overnight, scheduled workflows (C-5a) reconcile PSP settlements against
  internal records and raise a case for any mismatch.

Every one of those is config. None required a deploy.

*The platform requirements this loop leans on:* C-2, C-5a/b/c/d, C-6, C-7, C-8,
C-15, C-16, R-7, R-8, R-27.

---

## 5. Loop C — Change

**Frequency:** weekly to monthly. **Who:** the client's analyst, or you.

| Tier | Example | Who | Path |
| --- | --- | --- | --- |
| 3 | Add "referral source" to the booking form; change reminder copy; new report | **Client**, often via AI | Draft → diff → approve → published version |
| 2 | New workflow: no-show follow-up sequence; connect a review platform | Client (confident) or you | Same, plus testing in sandbox |
| 1 | Change how deposits are held | **You**, platform release | Loop E |

The mechanics are the same regardless of who: a change creates a **draft
version**, produces a **reviewable diff**, and on approval becomes a new
published version. Reversible by republishing the previous version.

This loop is where the predecessor's best property returns — people without
software development experience contributing real system change — except now it
is the *client's* team doing it on their own system, not yours doing it on their
behalf. That difference is the whole business model.

*Requires:* R-1, R-2, R-3, R-23 (diff/merge machinery reused for review).

---

## 6. Loop D — Harvest

**Frequency:** monthly. **Who:** you. **This is the loop that converts services
revenue into product leverage, and it does not exist today.**

### D1 · Survey the fleet

Across all tenants, list config objects that have been locally modified, and how
(R-37). You are looking for **repetition**:

```
Local overrides across 6 clients on bookings@2.3.x

  form booking.staff             modified in 5/6   ← generalise
    · deposit_amount field       4 clients (3 near-identical)
    · referral_source field      3 clients
  workflow no-show-followup      created in 3/6    ← generalise
  template booking.confirmation  modified in 6/6   ← expected (branding)
  workflow booking.reschedule    modified in 1/6   ← leave; client-specific
```

The rule of thumb: **built independently by three or more clients → it belongs in
the blueprint.** Once by one client → leave it local.

### D2 · Generalise

Take the four deposit implementations and design the one that covers all of them
— usually a config option rather than a hard-coded behaviour ("deposit: none |
fixed | percentage", with a threshold). This is real design work and it is where
your judgement earns its money.

### D3 · Publish

`bookings@2.4.0`, authored as files in your blueprint repo (git — §1.4),
exported/imported through the same machinery, with a changelog and any storage
migrations.

### D4 · Upgrade the fleet

Roll out progressively: your own test tenant, then a friendly client, then the
rest. Each upgrade is a dry-run merge (§1.5) reviewed with the client.

For clients who built the feature locally, the merge offers to **replace their
local implementation with the blueprint one** — they stop maintaining a fork and
start receiving improvements. Most will accept; the ones who decline keep their
version and you can see the divergence in D1 next month.

### D5 · Measure

Deltas per delivery should trend down. If the *same* delta keeps appearing after
you generalised it, the generalisation was wrong.

**Why this loop matters more than any other:** without it, every client's
improvements are trapped in that client, blueprints stagnate, and you are back to
an agency where revenue scales with headcount. Loop D is the difference.

*Requires:* R-37 (fleet view), R-21, R-23, R-24.

---

## 7. Loop E — Platform

**Frequency:** continuous. **Who:** you.

New capabilities (C-1…C-19), defect fixes, security, performance. One codebase,
released to all tenants at once.

Governance:

- Blueprints declare a supported platform version range; a platform release runs
  compatibility checks against published blueprints before rollout.
- Capability additions are rare and deliberate — see R-4. The pressure to add a
  domain concept to the platform ("just add a `cases` table") is constant and
  must be refused; it goes in a blueprint.
- Tier 1 changes always live here.

---

## 8. The two loops nobody plans for

### Support and incidents

- **Dead letter review** — a human looks at failed workflow runs, daily. Without
  a surface for this (R-15), failures accumulate invisibly. This is the single
  most common way config-driven systems rot.
- **Reconciliation exceptions** — PSP settlement mismatches, calendar sync
  divergence. These need a queue and an owner, not an alert nobody reads.
- **Per-tenant health** — queue depth, error rate, run latency (C-19).

### Offboarding

A client leaves. They get a full export of their configuration (R-24) and their
data (R-12), and the tenant database is decommissioned to a documented schedule.

Worth building early despite being unpleasant to think about: **"you can export
everything and leave" is a sales asset**, and it is the direct answer to the
lock-in objection that every buyer of a platform like this raises.

---

## 9. What this does to the economics

Same client, same requirements, two models:

| | Agency (predecessor) | Blueprint model |
| --- | --- | --- |
| Requirements | Blank page, abstract elicitation | Differential, against a running system |
| Build | Everything, from primitives | The delta only |
| Elapsed | 3–6 months | 2–4 weeks |
| Your effort | Most of it | A5 + A6 + A7, mostly |
| A fix found for client 4 | Applies to client 4 | Reaches all clients (Loop D) |
| Ongoing small changes | Ticket to you, billed hourly | Client does it (Loop C) |
| Revenue scales with | Headcount | Blueprints × clients |
| Marginal client cost | ~Constant | **Falls** with blueprint maturity |

The last row is the one that matters. In the agency model the tenth client costs
roughly what the first did. In the blueprint model the tenth costs a fraction —
because nine deliveries' worth of learning was harvested into the blueprint.

**This only holds if Loop D actually runs.** A blueprint that never absorbs what
was learned in delivery is just a starter template, and starter templates do not
change economics.

---

## 10. Requirement traceability

| Loop | Depends on | Plan phase |
| --- | --- | --- |
| A — Delivery | R-21 install, R-22 provenance, R-14 environments, R-12 import, R-16 connectors | Phase 2, 7 |
| B — Operate | C-2 contracts, C-5 invocation, C-6 state machines, C-7 allocation, R-7/8 authz, R-27 operator home | Phases 1, 3, 4, 6 |
| C — Change | R-1/2 versioned objects, R-3 AI parity, R-23 diff review | Phases 1, 2, 5 |
| D — Harvest | **R-37 fleet view**, R-21/23/24 blueprints | Phase 2 (+ R-37, new) |
| E — Platform | R-4 capability discipline | Continuous |
| Support | R-15 observability and DLQ surface | Phase 3.5, 7.5 |
| Offboarding | R-24 config export, R-12 data export | Phase 2, 7 |

**Nothing in Loop A or D is possible today.** Loop B is partly possible. Loop C
is not — there are no versioned, diffable config objects to change. That is the
gap the [development plan](./DEVELOPMENT_PLAN.md) closes, and this document is
the argument for why Phase 2 (config lifecycle) is not optional infrastructure
work but the core of the business model.

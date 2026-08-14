# Splx Documentation

Entry point for the architecture, direction and plan. Start here.

---

## Start here

| If you want to… | Read, in order | Time |
| --- | --- | --- |
| **Understand the direction** | [SYSTEM_THESIS.md](./SYSTEM_THESIS.md) §1–§4 | 20 min |
| **Know what state the code is in** | [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md) §1, §9, §10 | 15 min |
| **Plan sprints** | [BACKLOG.md](./BACKLOG.md) | 20 min |
| **Understand the business model** | [DELIVERY_LIFECYCLE.md](./DELIVERY_LIFECYCLE.md) | 25 min |
| **Everything, properly** | Thesis → Review → Plan → Lifecycle → Backlog | ~2 hrs |
| **Work on a feature today** | The relevant implemented-feature doc below | — |

**For a planning session:** Review §1 + §10 (what's broken), Thesis §2–§5 (what
we're building toward), Backlog Phase 0 + "Suggested first sprint".

---

## What splx is, and what it is becoming

**Today:** a multi-tenant workspace with a visual page builder, dynamic tables,
event-driven workflows, RBAC, and an AI sidebar. See the root
[README](../README.md) for the product tour.

**The direction:** a runtime where every unit of business behaviour is a typed,
named, versioned, permissioned, auditable object — authored by humans or AI, and
reviewable by people who cannot read code.

The bet is that AI made *writing* systems cheap and therefore made *reviewing,
governing and proving* them the scarce thing. Splx sells the substrate, not the
absence of code. Full argument: [SYSTEM_THESIS.md §1](./SYSTEM_THESIS.md).

---

## Current state at a glance

**Foundation is stronger than the abstraction.**

| | |
| --- | --- |
| ✅ **Solid** | `endpoint()` control plane · parameterised data access with identifier allowlisting · the `event_logs`/`workflow_schedule`/`workflow_runs` split · SSRF guard · workflow recursion guard · per-tenant database isolation |
| ⚠️ **Weak** | RBAC is coarse global verbs; custom roles resolve to nothing; permission checks fail open |
| ❌ **Missing** | **The Form object** — named field projections; CRUD HTTP; typed workflow invoke · config versioning, provenance, blueprints, export · Tier 1 (ledger/reservation) · AI tools (`agent/tools/` is empty) |
| 🔴 **Broken** | Workflow retries restart at step 0 → duplicate side effects · events not transactional with mutations and failures swallowed · report SQL allows cross-tenant reads |

**Requirement alignment:** 5 partial, 24 unmet of 38 — but weighted by cost, the
expensive infrastructure is the part that exists. Full scorecard:
[ARCHITECTURE_REVIEW.md §9](./ARCHITECTURE_REVIEW.md).

---

## The direction in one page

1. **The Form** ([Thesis §3](./SYSTEM_THESIS.md)) — a named field projection
   (data definition) used by UI, HTTP CRUD, and workflow inputs. Processes are
   workflows, invoked with POST. The predecessor's real insight, currently
   absent. Everything downstream needs it first.

2. **Three correctness tiers** ([Thesis §4](./SYSTEM_THESIS.md)) — Tier 1
   (ledger, stock, slots) is *code* with enforced invariants. Tier 2
   (orchestration) is durable, versioned config. Tier 3 (presentation) is freely
   configurable. Most config-driven platforms fail by treating money like an
   email template.

3. **Platform / blueprint / tenant** ([Thesis §5](./SYSTEM_THESIS.md)) — the
   platform ships *capabilities*; **blueprints** are versioned, installable
   packages of configuration; tenants layer local overrides with recorded
   provenance. Upgrades are field-level three-way merges. This replaces
   per-tenant git, and it is the mechanism that makes one core system serve many
   clients.

4. **AI parity** ([Thesis §1.3](./SYSTEM_THESIS.md)) — the AI does everything a
   user can, through the same interface, permissions and audit. It authors typed
   config; humans review structured diffs instead of code. Deliberately built
   *after* the Form, so the AI cannot become a permanent bypass.

5. **Five delivery loops** ([DELIVERY_LIFECYCLE.md](./DELIVERY_LIFECYCLE.md)) —
   the harvest loop (client work → generalised → blueprint → every client) is
   what converts agency economics into product leverage. It does not exist today.

---

## Document map

### Direction and planning

| Document | What it is | Stability |
| --- | --- | --- |
| [SYSTEM_THESIS.md](./SYSTEM_THESIS.md) | Why splx exists, the capability primitives, the Form, correctness tiers, blueprint model. Requirements `R-1`–`R-38`, capabilities `C-1`–`C-19` | Changes rarely — challenge it deliberately |
| [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md) | The implementation measured against the thesis. Scorecard, defects `D-1`–`D-11` | Re-run periodically; stale as work lands |
| [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) | Phases 0–7, sequencing arguments, milestones, GTM, open decisions `Q-1`–`Q-7` | Evolves as decisions are made |
| [DELIVERY_LIFECYCLE.md](./DELIVERY_LIFECYCLE.md) | Client delivery walkthrough, the blueprint/git question, the five loops | Stable |
| [DATA_PLACEMENT.md](./DATA_PLACEMENT.md) | Where each kind of data lives and why; the three planes; what harvest and model training need. Findings `P-1`–`P-7` | Stable |
| [BACKLOG.md](./BACKLOG.md) | Ticket-ready items `SPX-nnn` with acceptance criteria | Changes constantly |

### Implemented features

| Document | Covers |
| --- | --- |
| [API_CONTROL_PLANE.md](./API_CONTROL_PLANE.md) | The `endpoint()` layer. **Read before adding an API route** |
| [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) | Main DB vs resource store, multi-tenancy |
| [WORKFLOWS.md](./WORKFLOWS.md) | Event-driven workflows, schedule worker, action catalog |
| [RBAC_SYSTEM.md](./RBAC_SYSTEM.md) | Roles, RLS, capability checks |
| [PAGES_SYSTEM.md](./PAGES_SYSTEM.md) | Visual page builder and block types |
| [AI_CHAT_SYSTEM.md](./AI_CHAT_SYSTEM.md) · [AI_CHAT_MENTIONS.md](./AI_CHAT_MENTIONS.md) | Chat, mentions, streaming |
| [EVE_AGENT_PORT.md](./EVE_AGENT_PORT.md) | Eve sidebar agent runtime |
| [COMMS.md](./COMMS.md) | Email templates and `send_email` |
| [REPORTS.md](./REPORTS.md) · [ONBOARDING_OTP.md](./ONBOARDING_OTP.md) · [RELEASES.md](./RELEASES.md) · [INTEGRATION_CARDS.md](./INTEGRATION_CARDS.md) | Reports, auth flow, releases, integration UI |

---

## Progress

Update this table as phases land. Detail lives in
[BACKLOG.md](./BACKLOG.md).

| Phase | Theme | Milestone | Status |
| --- | --- | --- | --- |
| **0** | Stop silent failures | M1 Trustworthy | 🔴 Not started |
| **1** | Forms + HTTP CRUD | M2 Coherent | ⬜ Blocked by Phase 0 |
| **2** | Config lifecycle | M3 Leverageable | ⬜ Not started |
| **3** | Durable execution | M4 Operable | ⬜ Not started |
| **4** | Authz depth + operator | M4 Operable | ⬜ Blocked by Phase 1 |
| **5** | AI parity | M5 AI-native | ⬜ Blocked by Phase 1 |
| **6** | Tier 1 (ledger) | M6 Vertical-complete | ⬜ Deferred by design |
| **7** | Scale and ops | — | ⬜ Continuous |

**M1 → M3 changes the economics. M5 differentiates the product.** Do not
reorder: an AI that authors incoherent config is worse than no AI.

### Open decisions

Seven decisions gate later work — see
[DEVELOPMENT_PLAN.md §12](./DEVELOPMENT_PLAN.md). Q-1 and Q-2 are settled:

- **Q-1** (decided): the data-definition object is a **form**, not a fused contract
- **Q-2** (decided): page blocks bind to a form; CRUD is HTTP; processes are workflows
- **Q-7** (open): first vertical: bookings / shop / lending

---

## ID conventions

| Prefix | Means | Defined in |
| --- | --- | --- |
| `R-n` | Requirement — something the platform must do | Thesis §10 |
| `C-n` | Capability primitive — a platform building block | Thesis §2.3 |
| `D-n` | Defect found in the review | Review §10 |
| `P-n` | Data placement finding | Data Placement §8 |
| `Q-n` | Open decision needing a human call | Plan §12 |
| `SPX-nnn` | Work item — quote in branches, commits, tickets | Backlog |

Cross-references are load-bearing: a backlog item cites the defect it fixes and
the requirement it serves, so any ticket can be traced back to why it exists.

---

## Keeping this current

- **Backlog** — updated every sprint. Status table at the top.
- **Progress table above** — updated when a phase changes state.
- **Review** — re-run when a phase completes; the scorecard and defect register
  are the parts that go stale fastest.
- **Thesis** — should change rarely. If implementation reality contradicts it,
  that is a deliberate decision to record, not a silent drift.
- **Plan** — update when a `Q-n` is decided; record the decision and the date.

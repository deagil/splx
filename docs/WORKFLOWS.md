# Workflows

Durable event-driven and manual automations on top of the API control plane.

## Concepts

Three tables, three jobs — do not collapse them:

| Table | Meaning |
| --- | --- |
| `event_logs` | Immutable **facts**. "A contact was created at 14:02." Append-only. |
| `workflow_schedule` | Mutable **intentions**. "Run workflow X against that event, attempt 2, after 14:05." The queue. |
| `workflow_runs` | **Executions**. What happened when a schedule item was claimed. |

One event matching three workflows produces three schedule rows. A partial failure retries only the workflow that failed. A time-triggered run (later) produces a schedule row with no event, because nothing happened — which is why the fact log can never be the queue.

Workflow lifecycle facts (`workflow.run.succeeded`, `workflow.run.failed`) go back into `event_logs`, so a notify-on-failure workflow is an ordinary subscriber.

## Fan-out is transactional

[`emitEvent()`](../server/lib/events.ts) is the contract:

1. Insert the fact into `event_logs`.
2. Select enabled workflows whose `event_name` matches.
3. Insert one `workflow_schedule` row per match.
4. Commit.
5. Nudge the worker (`scheduleTick`).

If the emit fails, neither the fact nor the schedule rows land — consistent, still logged to the console, and deliberately unable to fail the originating mutation.

**Do not insert into `event_logs` directly.** Anything that bypasses `emitEvent()` silently skips fan-out.

A workflow created *after* an event never sees it. That is intentional.

## Worker

[`processDueSchedules()`](../server/workflows/worker.ts) claims due rows with `FOR UPDATE SKIP LOCKED`, executes steps through the action catalog, writes `workflow_runs`, and either marks the schedule `done` or returns it to `pending` with a future `run_after` (exponential backoff). Past five attempts the row stays `failed` (dead letter).

Invocation:

- `POST`/`GET` `/api/internal/workflows/tick` with `Authorization: Bearer <WORKFLOW_RUNNER_SECRET>` (or `CRON_SECRET` on Vercel).
- Opportunistic nudge after every successful `emitEvent` (debounced per process).
- Coolify: scheduled task every 10s hitting the tick route.
- Vercel: `vercel.json` cron every minute; set `CRON_SECRET`.

## Actions

Registered in [`server/workflows/actions/`](../server/workflows/actions/):

| Type | Purpose |
| --- | --- |
| `row` | create / update / delete via [`dataRepository`](../server/repositories/data.ts) |
| `http` | Outbound request with SSRF guard, timeout, capped body |
| `condition` | Stop the run unless a comparison matches |
| `send_email` | Send a Comms email template (see [COMMS.md](./COMMS.md)) |

Step inputs support path-only templates: `{{event.payload.record.id}}`, `{{steps.0.output.status}}`. No expression evaluation.

## Authority model

Workflows execute with **workspace authority**, not the triggering user's permissions. The check is at authoring time (`workflows.edit`). Granting that permission is effectively granting write access to every table the action catalog can reach.

Permissions: `workflows.view`, `workflows.edit`, `workflows.run`.

## Recursion guard

A workflow that writes a row emits `db.<table>.*` with `caused_by_run_id` set. Fan-out inherits `depth + 1` and refuses past 5. Without this, one misconfigured workflow is an unbounded write loop.

## Manual and Trigger-block runs

- `POST /api/v1/workflows/[id]/run` enqueues a schedule row (`trigger_source: manual` or `trigger_block`).
- Page Trigger blocks use `hookName` as the workflow id.

## UI

- **Automation** top-level nav (not under Build):
  - `/automation/events` — event type catalog (`event_types`) + recent `event_logs`
  - `/automation/listeners` — event → workflow bindings (`workflows` with `trigger_type = event`)
  - `/automation/workflows` — step definitions (JSON editor)
- Legacy `/build/workflows` and `/build/events` redirect here

## Adding an action

1. Add `server/workflows/actions/<name>.ts` with a Zod schema and `execute`.
2. Register it in `server/workflows/actions/index.ts`.
3. Cover the schema and any security guards with unit tests.

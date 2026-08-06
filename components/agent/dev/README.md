# Agent mock harness

Reviews every UI state of the Eve sidebar chat **without calling a model**. No
tokens, no `agent_threads` row, no network.

## Using it

Append `?agentMock=1` to any `/app` URL. Mock mode sticks for the browser tab
(sessionStorage) and a floating control panel appears bottom-left.

```
http://localhost:3000/app?agentMock=1              # default scenario
http://localhost:3000/app?agentMock=ask            # open on a specific scenario
http://localhost:3000/app?agentMock=0              # off (or hit × on the panel)
```

You do **not** need `NEXT_PUBLIC_AGENT_RUNTIME=eve` — mock mode mounts the Eve
pane regardless, so the legacy sidebar can stay the default while you work.

Mock mode is compiled out of production builds (`MOCK_MODE_AVAILABLE`), and the
harness itself is a lazy chunk that a normal session never loads.

## What the panel controls

| Control | What it does |
| --- | --- |
| Scenario | Which scripted conversation is loaded (`scenarios.ts`) |
| Transport | Play / pause / step / restart, plus 0.25×–4× speed |
| Scrubber | Jump to any frame, including mid-stream ones you can't catch live |
| Status | Read-out of the `ChatStatus` the pane is being handed |
| Force presence | Pin the orb to any state + label, independent of the messages |

The composer is live: typing and sending appends a canned reply turn and plays
it, so submit → busy → settle is exercised for real. The HITL cards are live
too — clicking an option resolves the pending request and continues.

## How it's wired

```
AgentSidebarContent
├─ live   → useChatSession (eve) ─┐
└─ mock   → useMockAgent ─────────┴→ AgentChatPane  ← the only render path
```

`AgentChatPane` is prop-driven and runtime-free, so what you tune in the
harness is literally what ships. Nothing in `components/agent/dev/` is imported
by the live path except the `MOCK_MODE_AVAILABLE` flag.

## Adding a scenario

Scenarios are short scripts in `scenarios.ts`; `buildFrames` expands each step
into every intermediate snapshot the real reducer would have produced (partial
text, `input-streaming` → `input-available` → `output-available`, and so on).

```ts
scenario("my-case", "My case", "What this pins down.", [
  { kind: "user", text: "Do the thing" },
  { chunks: 6, kind: "reasoning", text: "**Planning**\n\nFirst I'll…" },
  { kind: "tool", name: "web_search", input: { query: "thing" }, output: {} },
  { kind: "ask", prompt: "Which one?", options: [{ id: "a", label: "A" }] },
  { kind: "text", text: "Done." },
  { kind: "done" },
]);
```

Step kinds: `user`, `reasoning`, `text`, `tool`, `approval`, `ask`,
`authorization`, `todos`, `subagents`, `endTool`, `hold`, `done`, `fail`. Omitting the terminal field
(`approved`, `answerId`, `outcome`) or setting `stayRunning` parks the scenario
on that state — which is how you get a permanently-waiting approval card or a
tool that never returns.

### Subagents

`{ kind: "subagents", items: [...] }` sets the running roster — one pill each.
It replaces the roster wholesale, so each step is the full list: reuse a
`callId` (or keep the same array position) to change what a subagent is doing,
drop an entry to wind it down, and pass `[]` when they all finish. A turn
boundary (`user`, `done`, `fail`) clears it.

Two placements, switchable in the panel (`subagentPlacement` on the pane):

- **`feed`** (default) — left-aligned rows in the message timeline, standing in
  for the single opaque "Working via subagent" row.
- **`stack`** — floating above the composer, over the parent presence pill.

### The dock (sidebar closed)

**Close the sidebar while a scenario is playing** and the agent dock appears in
the corner nearest the sidebar. It is the same mock state, so scrubbing and
playback keep driving it. The dev panel moves to the opposite corner so the two
don't collide; flipping the sidebar side swaps both.

- Collapsed: one pill, subagents tucked behind it as offset cards with a count.
- Hover (or tab into it): the stack fans out.
- Click any pill: a read-only preview of *that* agent's messages. Subagent
  previews come from the child's own projection, so give fixtures `task` and
  `said` or the preview will be near-empty.
- It lingers ~6s after a turn settles, and stays put as long as a preview is
  open.

Three chip states, all worth reviewing (`ask` and `approval` scenarios cover
the first, any scenario ending in `done` covers the second):

| State | Look | Click |
| --- | --- | --- |
| Working | Orb + live label | Opens the preview |
| Awaiting input | Amber border, slow background shimmer | Opens the sidebar |
| Complete | Green check, opening of the answer + `…` | Opens the sidebar |

The awaiting-input shimmer is `attention-shimmer` in `globals.css` — a sweep
across the chip's *background*, not its text, so the label stays readable. It
applies to the in-sidebar presence pill and the feed subagent pills too.
Subagent pills in the feed are also click-to-preview when the sidebar is open.

Desktop only, and deliberately: the mobile sidebar is a Sheet that unmounts on
close, taking the session with it, so there is nothing left to dock.

A parked handoff (`stayRunning: true`) keeps its live row and the parent orb
going until something ends it — use `{ kind: "endTool" }` once the roster
empties, or the turn appears to run forever. While that row is live it reads
"Creating subagents" before the first child reports and "Dismissing subagents"
after the last one finishes.

Pills show the action only, not the subagent name — children are told apart by
orb colour, assigned in `lib/subagent-color.ts` (a `hue-rotate` over the fixed
orange ink, since `thinking-orbs` has no colour API). Colour follows subagent
*identity*, not roster position, so keep `name`/`callId` stable across steps or
pills will remount and reshuffle their colours mid-run.

In the live path this is not mocked data — `lib/subagent-activity.ts` unwraps
eve's `subagent.event` child streams off `agent.events` and folds each through
`defaultMessageReducer`, so a child's real reasoning and tool calls drive its
orb through the same resolution the parent uses.

Orb states map from tool category, so pick tool names deliberately:
`web_search`/`web_fetch` → searching, `eve:subagent:<name>` → weaving,
`todo_write`/memory → shaping, reasoning → solving, streaming text → composing,
anything else → working. See `lib/orb-activity.ts`.

Note the subagent naming: eve normalises delegated calls to
`eve:subagent:<name>`, and `getToolDisplayInfo` keys the handoff category off
that shape. A fixture named `task` or `agent_call` falls through to `general`
and renders as a generic "Running Task" row instead.

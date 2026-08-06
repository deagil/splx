import type { Scenario, ScenarioStep } from "./scenario-script";

/**
 * The mock scenario library.
 *
 * Each one exists to pin a UI state that is awkward to reach live: the empty
 * shell, a half-streamed reasoning block, every orb mode, the HITL cards, and
 * the failure paths. Add scenarios here rather than in the panel.
 */

const LOREM_REASONING = `**Reading the workspace schema**

The user is asking about overdue invoices, so I need the shape of the billing tables before I can answer. Two candidates look relevant: \`invoices\` and \`payments\`. I'll check the column list on both, then decide whether a join is needed or whether the status column on \`invoices\` is enough on its own.`;

const LONG_ANSWER = `Here's what I found across the two billing tables.

**Overdue invoices: 14 totalling £48,220**

The \`invoices\` table tracks status directly, so no join was needed — \`status = 'overdue'\` is maintained by the nightly job that compares \`due_date\` against \`paid_at\`.

| Client | Amount | Days overdue |
| --- | --- | --- |
| Northwind Ltd | £12,400 | 62 |
| Acme Trading | £9,850 | 41 |
| Barlow & Sons | £7,200 | 28 |

A few things worth flagging:

1. **Northwind is the outlier.** Their invoice is more than twice the median and is the only one past 60 days.
2. Three invoices flipped to overdue in the last week, which is above the usual rate of one.
3. \`payments\` has two rows with no matching invoice — likely manual entries worth reconciling.

Want me to draft the chase emails, or pull the payment history for Northwind first?`;

const SHORT_ANSWER =
  "Yes — the `invoices` table has a `status` column maintained nightly, so filtering on `status = 'overdue'` is reliable. No join needed.";

function scenario(
  id: string,
  name: string,
  description: string,
  steps: ScenarioStep[]
): Scenario {
  return { description, id, name, steps };
}

export const SCENARIOS: Scenario[] = [
  scenario(
    "empty",
    "Empty · greeting",
    "Fresh thread. Greeting block, idle composer, no presence pill.",
    []
  ),

  scenario(
    "submitted",
    "Just submitted",
    "User message sent, nothing back yet — the pending 'Thinking…' breathing orb.",
    [{ kind: "user", text: "Which invoices are overdue right now?" }]
  ),

  scenario(
    "reasoning",
    "Reasoning · streaming",
    "Live reasoning: 'solving' orb, heading-derived label, streaming timeline row.",
    [
      { kind: "user", text: "Which invoices are overdue right now?" },
      { chunks: 8, kind: "reasoning", text: LOREM_REASONING },
      { kind: "hold", label: "reasoning settled · gap before tool" },
    ]
  ),

  scenario(
    "tool-search",
    "Tool · web search",
    "'searching' orb, running label with the query, then collapsed into the timeline.",
    [
      { kind: "user", text: "What changed in the Base UI 1.7 release?" },
      { chunks: 4, kind: "reasoning", text: "I should check the changelog." },
      {
        input: { query: "Base UI 1.7 release notes" },
        kind: "tool",
        name: "web_search",
        output: {
          results: [{ title: "Base UI 1.7", url: "https://base-ui.com" }],
        },
      },
      {
        input: { url: "https://base-ui.com/changelog" },
        kind: "tool",
        name: "web_fetch",
        output: { content: "…" },
      },
      { chunks: 6, kind: "text", text: SHORT_ANSWER },
      { kind: "done" },
    ]
  ),

  scenario(
    "tool-running",
    "Tool · stuck running",
    "Parks on an in-flight tool call — the long-running 'working' orb state.",
    [
      { kind: "user", text: "Rebuild the reporting view." },
      {
        input: { command: "pnpm db:migrate" },
        kind: "tool",
        name: "bash",
        stayRunning: true,
      },
    ]
  ),

  scenario(
    "handoff",
    "Subagent · single handoff",
    "One delegated subagent, parked mid-flight so its row stays put for inspection.",
    [
      { kind: "user", text: "Audit the whole billing module for me." },
      {
        chunks: 4,
        kind: "reasoning",
        text: "This is broad — I'll delegate the audit.",
      },
      {
        input: { message: "Audit the billing module end to end" },
        kind: "tool",
        // eve normalises subagent calls to `eve:subagent:<name>` — the display
        // layer keys the handoff category off that shape.
        name: "eve:subagent:billing-auditor",
        stayRunning: true,
      },
      {
        items: [
          {
            label: "Reading the invoices schema",
            name: "billing-auditor",
            state: "solving",
          },
        ],
        kind: "subagents",
      },
      {
        items: [
          {
            label: "Searching for orphaned payments",
            name: "billing-auditor",
            state: "searching",
          },
        ],
        kind: "subagents",
      },
    ]
  ),

  scenario(
    "subagent-swarm",
    "Subagent · three in parallel",
    "The roster: three subagents in different states, finishing one by one.",
    [
      { kind: "user", text: "Audit billing, contacts and events together." },
      {
        chunks: 5,
        kind: "reasoning",
        text: "**Planning the split**\n\nThree independent areas — I'll run one subagent per area in parallel.",
      },
      {
        input: { message: "Audit billing" },
        kind: "tool",
        name: "eve:subagent:billing-auditor",
        stayRunning: true,
      },
      {
        items: [
          {
            label: "Reading the invoices schema",
            name: "billing-auditor",
            state: "solving",
          },
        ],
        kind: "subagents",
        label: "subagents · first one spins up",
      },
      {
        items: [
          {
            label: "Searching for orphaned payments",
            name: "billing-auditor",
            said: [
              "The `invoices` table maintains `status` nightly, so overdue is reliable without a join.",
              "Now checking `payments` for rows with no matching invoice.",
            ],
            state: "searching",
            task: "Audit the billing tables end to end.",
          },
          {
            label: "Scanning for duplicate rows",
            name: "contacts-cleaner",
            said: [
              "1,284 contacts total. Matching on normalised email and phone.",
            ],
            state: "working",
            task: "Find and merge duplicate contacts.",
          },
          {
            label: "Waiting for you…",
            name: "events-archivist",
            said: [
              "12,204 events are older than the 90-day retention window. Confirm before I archive them?",
            ],
            state: "listening",
            task: "Archive events older than the retention window.",
          },
        ],
        kind: "subagents",
        label: "subagents · all three running",
      },
      {
        items: [
          {
            label: "Writing up the findings",
            name: "billing-auditor",
            said: [
              "The `invoices` table maintains `status` nightly, so overdue is reliable without a join.",
              "Found 14 overdue invoices totalling £48,220, plus two orphaned payments.",
            ],
            state: "composing",
            task: "Audit the billing tables end to end.",
          },
          {
            label: "Merging 38 duplicates",
            name: "contacts-cleaner",
            said: [
              "1,284 contacts total. Matching on normalised email and phone.",
              "38 duplicate groups found. Merging into the most recently active row.",
            ],
            state: "shaping",
            task: "Find and merge duplicate contacts.",
          },
          {
            label: "Archiving 12k rows",
            name: "events-archivist",
            said: [
              "12,204 events are older than the 90-day retention window.",
              "Archiving in batches of 1,000.",
            ],
            state: "working",
            task: "Archive events older than the retention window.",
          },
        ],
        kind: "subagents",
        label: "subagents · activity changes in place",
      },
      {
        items: [
          {
            label: "Merging 38 duplicates",
            name: "contacts-cleaner",
            state: "shaping",
          },
          {
            label: "Archiving 12k rows",
            name: "events-archivist",
            state: "working",
          },
        ],
        kind: "subagents",
        label: "subagents · first finishes, stack collapses",
      },
      {
        items: [
          {
            label: "Archiving 12k rows",
            name: "events-archivist",
            state: "working",
          },
        ],
        kind: "subagents",
        label: "subagents · second finishes",
      },
      { items: [], kind: "subagents", label: "subagents · all finished" },
      // The handoff returns, so its row collapses into the timeline and the
      // parent orb moves on instead of running forever.
      {
        kind: "endTool",
        output: { areas: 3, findings: 4 },
      },
      {
        chunks: 12,
        kind: "text",
        text: "All three audits are done.\n\n- **Billing** — 14 overdue invoices, two orphaned payments\n- **Contacts** — 38 duplicates merged\n- **Events** — 12,204 rows archived",
      },
      { kind: "done" },
    ]
  ),

  scenario(
    "todos",
    "Tool · todo checklist",
    "The stateful todos card, updated across two calls (second replaces the first).",
    [
      { kind: "user", text: "Migrate the remaining Radix consumers." },
      {
        items: [
          { content: "Inventory Radix imports", status: "completed" },
          { content: "Migrate dialog wrappers", status: "in_progress" },
          { content: "Remove Radix packages", status: "pending" },
        ],
        kind: "todos",
      },
      { kind: "hold", label: "working between todo writes" },
      {
        items: [
          { content: "Inventory Radix imports", status: "completed" },
          { content: "Migrate dialog wrappers", status: "completed" },
          { content: "Remove Radix packages", status: "in_progress" },
        ],
        kind: "todos",
      },
      {
        chunks: 4,
        kind: "text",
        text: "Two of three done — removing the packages now.",
      },
      { kind: "done" },
    ]
  ),

  scenario(
    "approval",
    "HITL · approval gate",
    "Parks on an approval-requested tool card. 'Waiting for you…' listening orb.",
    [
      { kind: "user", text: "Delete the archived invoices." },
      {
        input: { table: "invoices", where: "archived = true" },
        kind: "approval",
        name: "delete_rows",
      },
    ]
  ),

  scenario(
    "ask",
    "HITL · input request",
    "The ask_question card with selectable options — click one to answer it live.",
    [
      { kind: "user", text: "Clean up the duplicate contacts." },
      {
        chunks: 4,
        kind: "reasoning",
        text: "There are two viable strategies here.",
      },
      {
        kind: "ask",
        options: [
          {
            description: "Keep the row with the most recent activity",
            id: "keep-newest",
            label: "Keep newest",
            style: "primary",
          },
          {
            description: "Keep the earliest created row",
            id: "keep-oldest",
            label: "Keep oldest",
          },
          {
            description: "Stop and let me review the list first",
            id: "cancel",
            label: "Cancel",
            style: "danger",
          },
        ],
        prompt: "I found 38 duplicate contacts. Which row should I keep?",
      },
    ]
  ),

  scenario(
    "authorization",
    "Authorization · connecting",
    "The connector sign-in card and the 'connecting' orb, then the completed alert.",
    [
      { kind: "user", text: "Pull last month's numbers from the warehouse." },
      {
        description: "Sign in to let Eve query the warehouse on your behalf.",
        displayName: "Warehouse",
        instructions: "Enter the code below at the sign-in page.",
        kind: "authorization",
        url: "https://example.com/device",
        userCode: "HJKL-4821",
      },
      { kind: "hold", label: "waiting on sign-in" },
      {
        description: "Sign in to let Eve query the warehouse on your behalf.",
        displayName: "Warehouse",
        kind: "authorization",
        outcome: "authorized",
      },
      { chunks: 4, kind: "text", text: "Connected — pulling the numbers now." },
      { kind: "done" },
    ]
  ),

  scenario(
    "long-answer",
    "Streaming · long answer",
    "A long markdown answer streaming in: 'composing' orb, tables, lists, footer on settle.",
    [
      { kind: "user", text: "Which invoices are overdue right now?" },
      { chunks: 6, kind: "reasoning", text: LOREM_REASONING },
      {
        input: { table: "invoices" },
        kind: "tool",
        name: "query_table",
        output: { rowCount: 14 },
      },
      { chunks: 24, kind: "text", text: LONG_ANSWER },
      { kind: "done" },
    ]
  ),

  scenario(
    "full-turn",
    "Full turn · everything",
    "Reasoning → tools → ask → more tools → answer. The end-to-end choreography.",
    [
      {
        kind: "user",
        text: "Tidy up the contacts table and tell me what you did.",
      },
      { chunks: 6, kind: "reasoning", text: LOREM_REASONING },
      {
        input: { query: "duplicate contacts" },
        kind: "tool",
        name: "retrieve_tools",
        output: { tools: ["query_table", "delete_rows"] },
      },
      {
        input: { table: "contacts" },
        kind: "tool",
        name: "query_table",
        output: { rowCount: 1284 },
      },
      {
        answerId: "keep-newest",
        kind: "ask",
        options: [
          { id: "keep-newest", label: "Keep newest", style: "primary" },
          { id: "keep-oldest", label: "Keep oldest" },
        ],
        prompt: "38 duplicates found. Which row should I keep?",
      },
      {
        items: [
          { content: "Identify duplicates", status: "completed" },
          { content: "Merge into newest rows", status: "in_progress" },
        ],
        kind: "todos",
      },
      {
        approved: true,
        input: { count: 38 },
        kind: "approval",
        name: "merge_rows",
      },
      { chunks: 20, kind: "text", text: LONG_ANSWER },
      { kind: "done" },
    ]
  ),

  scenario(
    "multi-turn",
    "Multi-turn history",
    "Three settled turns — message spacing, scroll anchoring, footers, no presence.",
    [
      { kind: "user", text: "What tables exist in this workspace?" },
      {
        chunks: 4,
        kind: "text",
        text: "There are 12 tables. The largest are `contacts`, `invoices`, and `events`.",
      },
      { kind: "done" },
      { kind: "user", text: "Which of those has the most rows?" },
      {
        input: { table: "events" },
        kind: "tool",
        name: "query_table",
        output: { rowCount: 91_204 },
      },
      {
        chunks: 4,
        kind: "text",
        text: "`events`, at 91,204 rows — roughly 8× the next largest.",
      },
      { kind: "done" },
      { kind: "user", text: "Which invoices are overdue right now?" },
      { chunks: 6, kind: "reasoning", text: LOREM_REASONING },
      { chunks: 16, kind: "text", text: LONG_ANSWER },
      { kind: "done" },
    ]
  ),

  scenario(
    "tool-error",
    "Failure · tool error",
    "A tool call that errors mid-turn but the turn recovers and answers anyway.",
    [
      { kind: "user", text: "Query the warehouse for last month." },
      {
        error: "connect ETIMEDOUT 10.0.4.12:5432",
        input: { table: "warehouse.invoices" },
        kind: "tool",
        name: "query_table",
      },
      {
        chunks: 4,
        kind: "text",
        text: "The warehouse connection timed out. I can retry, or query the local mirror instead.",
      },
      { kind: "done" },
    ]
  ),

  scenario(
    "turn-failed",
    "Failure · turn failed",
    "Terminal failure: error pill above the composer, status `error`.",
    [
      { kind: "user", text: "Summarise the last quarter." },
      {
        chunks: 4,
        kind: "reasoning",
        text: "Let me gather the quarterly figures.",
      },
      {
        kind: "fail",
        message: "Model provider returned 529 (overloaded). Please try again.",
      },
    ]
  ),
];

export const DEFAULT_SCENARIO_ID = "full-turn";

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((item) => item.id === id) ?? SCENARIOS[0]!;
}

/**
 * Canned reply used when you type into the mock composer, so the composer's own
 * submit → busy → settle behaviour can be exercised without a backend.
 */
export function buildReplyScript(userText: string): ScenarioStep[] {
  return [
    { kind: "user", text: userText },
    {
      chunks: 5,
      kind: "reasoning",
      text: `**Reading the request**\n\nThe user asked: "${userText}". This is a mock reply from the dev harness — no model was called.`,
    },
    {
      input: { query: userText },
      kind: "tool",
      name: "query_table",
      output: { rowCount: 42 },
    },
    {
      chunks: 10,
      kind: "text",
      text: `You asked: **${userText}**\n\nThis is a canned response from the mock harness, so you can exercise the composer, the presence pill, and the settle animation without spending tokens. Switch scenarios in the dev panel to inspect a specific state.`,
    },
    { kind: "done" },
  ];
}

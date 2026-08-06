export type ToolDisplayInfo = {
  category: string;
  integrationName?: string;
  showCategory: boolean;
  runningLabel: string;
  completedLabel: string;
  /** Short past-tense label for group summaries (no query/command details). */
  summaryLabel: string;
};

/** Categories where sequential calls replace prior state rather than append history. */
export const STATEFUL_TOOL_CATEGORIES = new Set(["todos"]);
const STATEFUL_CATEGORIES = STATEFUL_TOOL_CATEGORIES;

function titleCaseFromSnake(name: string): string {
  return name
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function truncate(value: string, max = 48): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

/** Latest markdown-style section title in a streaming or completed reasoning block. */
export function getLatestReasoningHeading(text: string): string | null {
  let latest: string | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const atx = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atx) {
      latest = atx[1]!.trim();
      continue;
    }

    const bold = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (bold) {
      latest = bold[1]!.trim();
    }
  }

  return latest ? truncate(latest, 56) : null;
}

/**
 * Remove the markdown heading line that `getLatestReasoningHeading` would use,
 * so expanded reasoning body does not repeat the timeline title.
 */
export function stripLatestReasoningHeading(text: string): string {
  const heading = getLatestReasoningHeading(text);
  if (!heading) {
    return text;
  }

  const lines = text.split("\n");
  let removeIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    const atx = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atx && truncate(atx[1]!.trim(), 56) === heading) {
      removeIndex = i;
      continue;
    }
    const bold = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (bold && truncate(bold[1]!.trim(), 56) === heading) {
      removeIndex = i;
    }
  }

  if (removeIndex < 0) {
    return text;
  }

  lines.splice(removeIndex, 1);
  if (lines[removeIndex]?.trim() === "") {
    lines.splice(removeIndex, 1);
  } else if (removeIndex > 0 && lines[removeIndex - 1]?.trim() === "") {
    lines.splice(removeIndex - 1, 1);
  }

  return lines.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
}

/** Common progressive verbs in model reasoning headers → past tense. */
const REASONING_VERB_PAST: Record<string, string> = {
  analysing: "Analysed",
  analyzing: "Analyzed",
  checking: "Checked",
  comparing: "Compared",
  confirming: "Confirmed",
  considering: "Considered",
  deciding: "Decided",
  evaluating: "Evaluated",
  exploring: "Explored",
  fetching: "Fetched",
  finding: "Found",
  gathering: "Gathered",
  getting: "Got",
  identifying: "Identified",
  investigating: "Investigated",
  listing: "Listed",
  looking: "Looked",
  making: "Made",
  opening: "Opened",
  parsing: "Parsed",
  planning: "Planned",
  preparing: "Prepared",
  reading: "Read",
  resolving: "Resolved",
  reviewing: "Reviewed",
  running: "Ran",
  scanning: "Scanned",
  searching: "Searched",
  summarising: "Summarised",
  summarizing: "Summarized",
  taking: "Took",
  thinking: "Thought",
  verifying: "Verified",
  writing: "Wrote",
};

/**
 * Convert a reasoning section title like "Searching for files" to past tense
 * for completed timeline rows ("Searched for files").
 */
export function toPastTenseReasoningHeading(heading: string): string {
  const trimmed = heading.trim();
  if (!trimmed) {
    return trimmed;
  }

  const match = trimmed.match(/^([A-Za-z]+)([\s'’].*)?$/);
  if (!match) {
    return trimmed;
  }

  const first = match[1]!;
  const rest = match[2] ?? "";
  const lower = first.toLowerCase();

  const mapped = REASONING_VERB_PAST[lower];
  if (mapped) {
    return `${mapped}${rest}`;
  }

  if (lower.endsWith("ing") && lower.length > 5) {
    const stem = first.slice(0, -3);
    const past = `${stem}${stem.toLowerCase().endsWith("e") ? "d" : "ed"}`;
    return `${past.charAt(0).toUpperCase()}${past.slice(1)}${rest}`;
  }

  return trimmed;
}

export type ReasoningSummaryInput = {
  isStreaming: boolean;
  durationSeconds?: number;
  text?: string;
};

/**
 * Condensed / duration-based label ("Thought briefly", "Thought for 3s").
 * Does not use the reasoning markdown heading — keep group summaries short.
 */
export function getReasoningSummaryLabel({
  isStreaming,
  durationSeconds,
  text,
}: ReasoningSummaryInput): string {
  if (isStreaming) {
    const heading = text ? getLatestReasoningHeading(text) : null;
    if (heading) {
      return heading;
    }
    return "Thinking...";
  }
  if (durationSeconds !== undefined && durationSeconds > 0) {
    return `Thought for ${durationSeconds}s`;
  }
  return "Thought briefly";
}

/**
 * Expanded timeline / solo-reasoning row label.
 * Prefers the latest markdown heading, past-tense when the thought has finished.
 */
export function getReasoningTimelineLabel({
  isStreaming,
  durationSeconds,
  text,
}: ReasoningSummaryInput): string {
  const heading = text ? getLatestReasoningHeading(text) : null;
  if (heading) {
    return isStreaming ? heading : toPastTenseReasoningHeading(heading);
  }
  return getReasoningSummaryLabel({ durationSeconds, isStreaming, text });
}

function getBashCommand(input: unknown): string | undefined {
  if (!input || typeof input !== "object") {
    return;
  }
  const record = input as Record<string, unknown>;
  for (const key of ["command", "cmd", "script", "code"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return truncate(value);
    }
  }
}

function getSearchQuery(input: unknown): string | undefined {
  if (!input || typeof input !== "object") {
    return;
  }
  const record = input as Record<string, unknown>;
  for (const key of ["query", "q", "search", "search_term", "term"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return truncate(value, 40);
    }
  }
}

function getSubagentMessage(input: unknown): string | undefined {
  if (!input || typeof input !== "object") {
    return;
  }
  const record = input as Record<string, unknown>;
  for (const key of ["message", "task", "prompt", "instructions", "goal"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return truncate(value, 72);
    }
  }
}

/** Built-in `agent` tool or Eve-qualified subagent tool names. */
function isSubagentTool(name: string): boolean {
  return (
    name === "agent" ||
    name.includes("subagent") ||
    name.endsWith(":agent") ||
    name.includes("handoff") ||
    name.includes("delegate")
  );
}

function subagentDisplayName(toolName: string): string {
  const lower = toolName.toLowerCase();
  if (
    lower === "agent" ||
    lower.endsWith(":agent") ||
    lower.includes("subagent:agent")
  ) {
    return "subagent";
  }
  const bare = toolName.split(/[:/]/).at(-1) ?? toolName;
  return bare.replace(/[_-]+/g, " ").trim() || "subagent";
}

/** Agent / MCP tool discovery (not connector or web search). */
function isInternalToolSearch(name: string): boolean {
  return (
    name === "retrieve_tools" ||
    name === "connection_search" ||
    name === "list_tools" ||
    name === "get_tools" ||
    name === "load_tools" ||
    name === "search_tools"
  );
}

/** Built-in web search tools. */
function isWebSearch(name: string): boolean {
  return (
    name === "web_search" ||
    name === "search_web" ||
    name === "internet_search" ||
    name === "search"
  );
}

/**
 * Map Eve tool names to display category, labels, and integration metadata.
 */
export function getToolDisplayInfo(
  toolName: string,
  input?: unknown
): ToolDisplayInfo {
  const name = toolName.toLowerCase();

  if (name === "bash" || name === "shell" || name.endsWith("__bash")) {
    const command = getBashCommand(input);
    return {
      category: "development",
      completedLabel: command ? `Ran ${command}` : "Ran code",
      runningLabel: command ? `Running ${command}` : "Running code",
      showCategory: false,
      summaryLabel: "Ran code",
    };
  }

  if (
    name === "todo" ||
    name.startsWith("todo") ||
    name.includes("todo_write") ||
    name.includes("todo_read")
  ) {
    return {
      category: "todos",
      completedLabel: "Checked todo list",
      runningLabel: "Checking todo list",
      showCategory: false,
      summaryLabel: "Checked todo list",
    };
  }

  // Agent C had six connector branches here — slack, hubspot, notion, drive,
  // tally and platform — that produced its "Searching Drive for X" labels.
  // They are its domain, so they came out. splx tools get a branch each in a
  // follow-up pass (docs/EVE_AGENT_PORT.md §8.3); until then any unmatched tool
  // falls through to the `general` case at the bottom and still renders, just
  // with generic labels.

  if (name === "save_memory" || name.includes("memory")) {
    return {
      category: "memory",
      completedLabel: "Saved memory",
      runningLabel: "Saving memory",
      showCategory: false,
      summaryLabel: "Saved memory",
    };
  }

  if (isInternalToolSearch(name)) {
    return {
      category: "retrieve_tools",
      completedLabel: "Checked tools",
      runningLabel: "Checking tools",
      showCategory: false,
      summaryLabel: "Checked tools",
    };
  }

  if (
    name === "ask_question" ||
    name === "request_input" ||
    name.includes("ask_question")
  ) {
    return {
      category: "question",
      completedLabel: "Asked a question",
      runningLabel: "Waiting for an answer",
      showCategory: false,
      summaryLabel: "Asked a question",
    };
  }

  if (isWebSearch(name)) {
    const query = getSearchQuery(input);
    return {
      category: "web_search",
      completedLabel: query
        ? `Searched the web for “${query}”`
        : "Searched the web",
      runningLabel: query
        ? `Searching the web for “${query}”`
        : "Searching the web",
      showCategory: false,
      summaryLabel: "Searched the web",
    };
  }

  if (
    name === "web_fetch" ||
    name === "webfetch" ||
    name.includes("web_fetch") ||
    name.includes("webfetch")
  ) {
    return {
      category: "web_fetch",
      completedLabel: "Ran Web Fetch",
      runningLabel: "Fetching web page",
      showCategory: false,
      summaryLabel: "Fetched web page",
    };
  }

  if (isSubagentTool(name)) {
    const task = getSubagentMessage(input);
    const who = subagentDisplayName(toolName);
    return {
      category: "handoff",
      completedLabel: task
        ? `Finished via ${who}: ${task}`
        : `Finished via ${who}`,
      runningLabel: task ? `Working via ${who}: ${task}` : `Working via ${who}`,
      showCategory: false,
      summaryLabel: "Delegated to subagent",
    };
  }

  if (name.includes("search")) {
    const query = getSearchQuery(input);
    return {
      category: "web_search",
      completedLabel: query ? `Searched for “${query}”` : "Searched",
      runningLabel: query ? `Searching for “${query}”` : "Searching",
      showCategory: false,
      summaryLabel: "Searched",
    };
  }

  const pretty = titleCaseFromSnake(toolName);
  return {
    category: "general",
    completedLabel: `Ran ${pretty}`,
    runningLabel: `Running ${pretty}`,
    showCategory: false,
    summaryLabel: `Ran ${pretty}`,
  };
}

export function formatToolName(name: string): string {
  return titleCaseFromSnake(name);
}

export function serializeToolOutput(
  output: unknown,
  errorText?: string
): string | undefined {
  if (errorText) {
    return errorText;
  }
  if (output === undefined || output === null) {
    return;
  }
  if (typeof output === "string") {
    return output;
  }
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

export function asToolInputs(
  input: unknown
): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return;
  }
  return input as Record<string, unknown>;
}

type SummarizableToolCall = {
  tool_name: string;
  tool_category: string;
  message?: string;
};

/**
 * Collapse sequential stateful tool calls (e.g. todos status updates) to the
 * latest entry so chat history reflects final state, not intermediate snapshots.
 */
export function collapseStatefulToolCalls<T extends SummarizableToolCall>(
  entries: T[]
): T[] {
  const result: T[] = [];
  for (const entry of entries) {
    const prev = result.at(-1);
    if (
      prev &&
      STATEFUL_CATEGORIES.has(entry.tool_category) &&
      prev.tool_category === entry.tool_category
    ) {
      result[result.length - 1] = entry;
      continue;
    }
    result.push(entry);
  }
  return result;
}

function lowercaseFirst(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function getUniqueSummarizableToolCalls(
  toolCalls: SummarizableToolCall[]
): SummarizableToolCall[] {
  const unique: SummarizableToolCall[] = [];
  const seen = new Set<string>();
  for (const call of toolCalls) {
    const category = call.tool_category || "general";
    if (seen.has(category)) {
      continue;
    }
    seen.add(category);
    unique.push(call);
  }
  return unique;
}

/**
 * Join summary labels: "a", "a and b", "a, b and c", or "Used N tools" for 4+.
 */
export function joinSummaryLabels(labels: string[]): string {
  if (labels.length === 0) {
    return "Working";
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${lowercaseFirst(labels[1]!)}`;
  }
  if (labels.length === 3) {
    return `${labels[0]}, ${lowercaseFirst(labels[1]!)} and ${lowercaseFirst(labels[2]!)}`;
  }
  return `Used ${labels.length} tools`;
}

function summaryLabelForCall(call: SummarizableToolCall): string {
  // Prefer the short category summary (no query/command details)
  return getToolDisplayInfo(call.tool_name).summaryLabel;
}

/**
 * Smart group header: named labels for 1–3 unique tool types, count for 4+.
 * e.g. "Checked todos", "Checked todos and searched HubSpot",
 * "Checked todos, searched HubSpot and ran code"
 */
export function getToolCallsSummaryLabel(
  toolCalls: SummarizableToolCall[]
): string {
  const unique = getUniqueSummarizableToolCalls(toolCalls);
  if (unique.length === 0) {
    return "Used 0 tools";
  }
  return joinSummaryLabels(unique.map(summaryLabelForCall));
}

/**
 * Combined activity header, e.g. "Thought for 3s, checked tools and searched HubSpot".
 */
export function getActivitySummaryLabel(
  reasoning: ReasoningSummaryInput | null,
  toolCalls: SummarizableToolCall[]
): string {
  const labels: string[] = [];

  if (reasoning) {
    labels.push(getReasoningSummaryLabel(reasoning));
  }

  for (const call of getUniqueSummarizableToolCalls(toolCalls)) {
    labels.push(summaryLabelForCall(call));
  }

  return joinSummaryLabels(labels);
}

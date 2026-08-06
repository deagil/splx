/**
 * Database schema definitions using Drizzle ORM.
 *
 * All tables and columns use snake_case naming convention.
 * This schema supports AI SDK 5 message parts format.
 *
 * @module lib/db/schema
 */

import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AgentThreadState } from "../types/agent-thread";
import type { AppUsage } from "../usage";

export const user = pgTable("users", {
  ai_context: text("ai_context"),
  ai_guidance: text("ai_guidance"),
  ai_tone: text("ai_tone"),
  avatar_url: text("avatar_url"),
  email: varchar("email", { length: 64 }).notNull(),
  firstname: text("firstname"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  job_title: text("job_title"),
  lastname: text("lastname"),
  onboarding_completed: boolean("onboarding_completed")
    .notNull()
    .default(false),
  password: varchar("password", { length: 64 }),
  proficiency: text("proficiency"),
});

export type User = InferSelectModel<typeof user>;

export const workspace = pgTable("workspaces", {
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  mode: text("mode").notNull().default("hosted"),
  name: text("name").notNull(),
  owner_user_id: uuid("owner_user_id").references(() => user.id),
  plan: text("plan").notNull().default("lite"),
  slug: text("slug"),
  stripe_current_period_end: timestamp("stripe_current_period_end", {
    withTimezone: true,
  }),
  stripe_customer_id: text("stripe_customer_id").unique(),
  stripe_price_id: text("stripe_price_id"),
  stripe_subscription_id: text("stripe_subscription_id").unique(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Workspace = InferSelectModel<typeof workspace>;

export const role = pgTable(
  "roles",
  {
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    id: text("id").notNull(),
    label: text("label").notNull(),
    level: integer("level").notNull().default(0),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workspace_id, table.id] }),
  })
);

export type Role = InferSelectModel<typeof role>;

export const team = pgTable("teams", {
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type Team = InferSelectModel<typeof team>;

export const workspaceUser = pgTable(
  "workspace_users",
  {
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    role_id: text("role_id").notNull(),
    team_id: uuid("team_id").references(() => team.id, {
      onDelete: "set null",
    }),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    roleReference: foreignKey({
      columns: [table.workspace_id, table.role_id],
      foreignColumns: [role.workspace_id, role.id],
    }),
  })
);

export type WorkspaceUser = InferSelectModel<typeof workspaceUser>;

export const workspaceInvite = pgTable("workspace_invites", {
  accepted_at: timestamp("accepted_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  email: text("email"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  invited_by: uuid("invited_by")
    .notNull()
    .references(() => user.id),
  roles: text("roles").array().notNull(),
  user_id: uuid("user_id").references(() => user.id),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type WorkspaceInvite = InferSelectModel<typeof workspaceInvite>;

export const workspaceApp = pgTable("workspace_apps", {
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  credential_ref: text("credential_ref").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  type: text("type").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type WorkspaceApp = InferSelectModel<typeof workspaceApp>;

export type PageBlockConfig = Record<string, unknown>;

export const page = pgTable("pages", {
  blocks: jsonb("blocks").$type<PageBlockConfig[]>().notNull().default([]),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_by: uuid("created_by").references(() => user.id),
  description: text("description"),
  id: text("id").primaryKey().notNull(),
  is_system: boolean("is_system").notNull().default(false),
  layout: jsonb("layout")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  name: text("name").notNull(),
  settings: jsonb("settings")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type Page = InferSelectModel<typeof page>;

export type TableConfig = Record<string, unknown>;

export const table = pgTable("tables", {
  config: jsonb("config").$type<TableConfig>().notNull().default({}),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_by: uuid("created_by").references(() => user.id),
  description: text("description"),
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type Table = InferSelectModel<typeof table>;

export type ReportChartConfig = Record<string, unknown>;

export const report = pgTable("reports", {
  chart_config: jsonb("chart_config")
    .$type<ReportChartConfig>()
    .notNull()
    .default({}),
  chart_type: text("chart_type"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_by: uuid("created_by").references(() => user.id),
  description: text("description"),
  id: text("id").primaryKey().notNull(),
  sql: text("sql").notNull(),
  title: text("title").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type Report = InferSelectModel<typeof report>;

export const chat = pgTable("chats", {
  created_at: timestamp("created_at").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  last_context: jsonb("last_context").$type<AppUsage | null>(),
  title: text("title").notNull(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("messages", {
  attachments: json("attachments").notNull(),
  chat_id: uuid("chat_id")
    .notNull()
    .references(() => chat.id),
  created_at: timestamp("created_at").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  mentions:
    jsonb("mentions").$type<
      Array<{ type: string; label: string; [key: string]: unknown }>
    >(),
  parts: json("parts").notNull(),
  role: varchar("role").notNull(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "votes",
  {
    chat_id: uuid("chat_id")
      .notNull()
      .references(() => chat.id),
    is_upvoted: boolean("is_upvoted").notNull(),
    message_id: uuid("message_id")
      .notNull()
      .references(() => message.id),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chat_id, table.message_id] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "documents",
  {
    content: text("content"),
    created_at: timestamp("created_at").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    kind: varchar("kind", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    title: text("title").notNull(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.created_at] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "suggestions",
  {
    created_at: timestamp("created_at").notNull(),
    description: text("description"),
    document_created_at: timestamp("document_created_at").notNull(),
    document_id: uuid("document_id").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    is_resolved: boolean("is_resolved").notNull().default(false),
    original_text: text("original_text").notNull(),
    suggested_text: text("suggested_text").notNull(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    documentRef: foreignKey({
      columns: [table.document_id, table.document_created_at],
      foreignColumns: [document.id, document.created_at],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "streams",
  {
    chat_id: uuid("chat_id").notNull(),
    created_at: timestamp("created_at").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    chatRef: foreignKey({
      columns: [table.chat_id],
      foreignColumns: [chat.id],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const aiSkill = pgTable("ai_skills", {
  command: text("command"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  description: text("description"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id").references(() => workspace.id, {
    onDelete: "cascade",
  }),
});

export type AiSkill = InferSelectModel<typeof aiSkill>;

/**
 * Append-only record of mutations made through the API control plane.
 * Written by server/lib/audit.ts. See
 * supabase/migrations/20260805120000_audit_logs_and_event_outbox.sql.
 */
export const auditLog = pgTable("audit_logs", {
  action: text("action").notNull(),
  actor_user_id: uuid("actor_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  changes: jsonb("changes").notNull().default({}),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  request_id: text("request_id"),
  resource_id: text("resource_id"),
  resource_type: text("resource_type").notNull(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type AuditLog = InferSelectModel<typeof auditLog>;

/**
 * Append-only fact log of domain and technical events.
 * Written by server/lib/events.ts, which also fans out matching workflows into
 * workflow_schedule in the same transaction. Do not insert here directly.
 */
export const eventLog = pgTable("event_logs", {
  actor_user_id: uuid("actor_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  /** Provenance: the workflow_runs.id that caused this fact, when applicable. */
  caused_by_run_id: uuid("caused_by_run_id"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  event_name: text("event_name").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  payload: jsonb("payload").notNull().default({}),
  request_id: text("request_id"),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type EventLog = InferSelectModel<typeof eventLog>;

/**
 * Workspace catalog of event type names for the Automation UI.
 * Does not gate emitEvent(); system rows are seeded and not deletable.
 */
export const eventType = pgTable("event_types", {
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_by: uuid("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  is_system: boolean("is_system").notNull().default(false),
  name: text("name").notNull(),
  payload_schema: jsonb("payload_schema")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type EventType = InferSelectModel<typeof eventType>;

export interface WorkflowStepConfig {
  input?: Record<string, unknown>;
  label?: string;
  type: string;
}

export const workflow = pgTable("workflows", {
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_by: uuid("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  event_name: text("event_name"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  steps: jsonb("steps").$type<WorkflowStepConfig[]>().notNull().default([]),
  trigger_type: text("trigger_type").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type Workflow = InferSelectModel<typeof workflow>;

export const workflowSchedule = pgTable("workflow_schedule", {
  actor_user_id: uuid("actor_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  attempts: integer("attempts").notNull().default(0),
  context: jsonb("context")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  depth: integer("depth").notNull().default(0),
  event_id: uuid("event_id").references(() => eventLog.id, {
    onDelete: "set null",
  }),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  last_error: text("last_error"),
  locked_at: timestamp("locked_at", { withTimezone: true }),
  request_id: text("request_id"),
  run_after: timestamp("run_after", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull().default("pending"),
  trigger_source: text("trigger_source").notNull(),
  workflow_id: uuid("workflow_id")
    .notNull()
    .references(() => workflow.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type WorkflowSchedule = InferSelectModel<typeof workflowSchedule>;

export interface WorkflowRunStepResult {
  error?: string;
  input?: Record<string, unknown>;
  label?: string;
  output?: Record<string, unknown>;
  skipped?: boolean;
  type: string;
}

export const workflowRun = pgTable("workflow_runs", {
  error: text("error"),
  finished_at: timestamp("finished_at", { withTimezone: true }),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  schedule_id: uuid("schedule_id").references(() => workflowSchedule.id, {
    onDelete: "set null",
  }),
  started_at: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull(),
  steps: jsonb("steps").$type<WorkflowRunStepResult[]>().notNull().default([]),
  workflow_id: uuid("workflow_id")
    .notNull()
    .references(() => workflow.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type WorkflowRun = InferSelectModel<typeof workflowRun>;

/**
 * Threads for the eve sidebar agent.
 *
 * Separate from `chat`/`message` on purpose: the two runtimes run side by side
 * behind NEXT_PUBLIC_AGENT_RUNTIME, and eve's event log does not round-trip
 * from AI SDK UIMessages. See docs/EVE_AGENT_PORT.md.
 */
export const agentThread = pgTable("agent_threads", {
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  state: jsonb("state")
    .$type<AgentThreadState>()
    .notNull()
    .default({ events: [], session: { streamIndex: 0 } }),
  title: text("title"),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type AgentThread = InferSelectModel<typeof agentThread>;

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
import type { AppUsage } from "../usage";

export const user = pgTable("users", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  firstname: text("firstname"),
  lastname: text("lastname"),
  avatar_url: text("avatar_url"),
  job_title: text("job_title"),
  ai_context: text("ai_context"),
  proficiency: text("proficiency"),
  ai_tone: text("ai_tone"),
  ai_guidance: text("ai_guidance"),
  onboarding_completed: boolean("onboarding_completed").notNull().default(
    false,
  ),
});

export type User = InferSelectModel<typeof user>;

export const workspace = pgTable("workspaces", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug"),
  owner_user_id: uuid("owner_user_id").references(() => user.id),
  mode: text("mode").notNull().default("hosted"),
  avatar_url: text("avatar_url"),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  stripe_customer_id: text("stripe_customer_id").unique(),
  stripe_subscription_id: text("stripe_subscription_id").unique(),
  stripe_price_id: text("stripe_price_id"),
  stripe_current_period_end: timestamp("stripe_current_period_end", {
    withTimezone: true,
  }),
  plan: text("plan").notNull().default("lite"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Workspace = InferSelectModel<typeof workspace>;

export const role = pgTable(
  "roles",
  {
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    level: integer("level").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workspace_id, table.id] }),
  }),
);

export type Role = InferSelectModel<typeof role>;

export const team = pgTable("teams", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Team = InferSelectModel<typeof team>;

export const workspaceUser = pgTable("workspace_users", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  user_id: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role_id: text("role_id").notNull(),
  team_id: uuid("team_id").references(() => team.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  roleReference: foreignKey({
    columns: [table.workspace_id, table.role_id],
    foreignColumns: [role.workspace_id, role.id],
  }),
}));

export type WorkspaceUser = InferSelectModel<typeof workspaceUser>;

export const workspaceInvite = pgTable("workspace_invites", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  roles: text("roles").array().notNull(),
  invited_by: uuid("invited_by")
    .notNull()
    .references(() => user.id),
  email: text("email"),
  user_id: uuid("user_id").references(() => user.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  accepted_at: timestamp("accepted_at", { withTimezone: true }),
});

export type WorkspaceInvite = InferSelectModel<typeof workspaceInvite>;

export const workspaceApp = pgTable("workspace_apps", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  credential_ref: text("credential_ref").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WorkspaceApp = InferSelectModel<typeof workspaceApp>;

export type PageBlockConfig = Record<string, unknown>;

export const page = pgTable("pages", {
  id: text("id").primaryKey().notNull(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  layout: jsonb("layout")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  blocks: jsonb("blocks")
    .$type<PageBlockConfig[]>()
    .notNull()
    .default([]),
  settings: jsonb("settings")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  is_system: boolean("is_system").notNull().default(false),
  created_by: uuid("created_by").references(() => user.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Page = InferSelectModel<typeof page>;

export type TableConfig = Record<string, unknown>;

export const table = pgTable("tables", {
  id: text("id").primaryKey().notNull(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config")
    .$type<TableConfig>()
    .notNull()
    .default({}),
  created_by: uuid("created_by").references(() => user.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Table = InferSelectModel<typeof table>;

export type ReportChartConfig = Record<string, unknown>;

export const report = pgTable("reports", {
  id: text("id").primaryKey().notNull(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  sql: text("sql").notNull(),
  chart_type: text("chart_type"),
  chart_config: jsonb("chart_config")
    .$type<ReportChartConfig>()
    .notNull()
    .default({}),
  created_by: uuid("created_by").references(() => user.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Report = InferSelectModel<typeof report>;

export const chat = pgTable("chats", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  created_at: timestamp("created_at").notNull(),
  title: text("title").notNull(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  last_context: jsonb("last_context").$type<AppUsage | null>(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("messages", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chat_id: uuid("chat_id")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  mentions: jsonb("mentions").$type<
    Array<{ type: string; label: string; [key: string]: unknown }>
  >(),
  created_at: timestamp("created_at").notNull(),
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
    message_id: uuid("message_id")
      .notNull()
      .references(() => message.id),
    is_upvoted: boolean("is_upvoted").notNull(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chat_id, table.message_id] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "documents",
  {
    id: uuid("id").notNull().defaultRandom(),
    created_at: timestamp("created_at").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("kind", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.created_at] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "suggestions",
  {
    id: uuid("id").notNull().defaultRandom(),
    document_id: uuid("document_id").notNull(),
    document_created_at: timestamp("document_created_at").notNull(),
    original_text: text("original_text").notNull(),
    suggested_text: text("suggested_text").notNull(),
    description: text("description"),
    is_resolved: boolean("is_resolved").notNull().default(false),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id),
    created_at: timestamp("created_at").notNull(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.document_id, table.document_created_at],
      foreignColumns: [document.id, document.created_at],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "streams",
  {
    id: uuid("id").notNull().defaultRandom(),
    chat_id: uuid("chat_id").notNull(),
    created_at: timestamp("created_at").notNull(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chat_id],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

export const aiSkill = pgTable("ai_skills", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id").references(() => workspace.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  command: text("command"),
  description: text("description"),
  prompt: text("prompt").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AiSkill = InferSelectModel<typeof aiSkill>;

/**
 * Append-only record of mutations made through the API control plane.
 * Written by server/lib/audit.ts. See
 * supabase/migrations/20260805120000_audit_logs_and_event_outbox.sql.
 */
export const auditLog = pgTable("audit_logs", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  actor_user_id: uuid("actor_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  resource_type: text("resource_type").notNull(),
  resource_id: text("resource_id"),
  changes: jsonb("changes").notNull().default({}),
  request_id: text("request_id"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuditLog = InferSelectModel<typeof auditLog>;

/**
 * Append-only fact log of domain and technical events.
 * Written by server/lib/events.ts, which also fans out matching workflows into
 * workflow_schedule in the same transaction. Do not insert here directly.
 */
export const eventLog = pgTable("event_logs", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  event_name: text("event_name").notNull(),
  payload: jsonb("payload").notNull().default({}),
  request_id: text("request_id"),
  actor_user_id: uuid("actor_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  /** Provenance: the workflow_runs.id that caused this fact, when applicable. */
  caused_by_run_id: uuid("caused_by_run_id"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventLog = InferSelectModel<typeof eventLog>;

/**
 * Workspace catalog of event type names for the Automation UI.
 * Does not gate emitEvent(); system rows are seeded and not deletable.
 */
export const eventType = pgTable("event_types", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  payload_schema: jsonb("payload_schema")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  is_system: boolean("is_system").notNull().default(false),
  created_by: uuid("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventType = InferSelectModel<typeof eventType>;

export type WorkflowStepConfig = {
  type: string;
  label?: string;
  input?: Record<string, unknown>;
};

export const workflow = pgTable("workflows", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  trigger_type: text("trigger_type").notNull(),
  event_name: text("event_name"),
  steps: jsonb("steps").$type<WorkflowStepConfig[]>().notNull().default([]),
  created_by: uuid("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Workflow = InferSelectModel<typeof workflow>;

export const workflowSchedule = pgTable("workflow_schedule", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  workflow_id: uuid("workflow_id")
    .notNull()
    .references(() => workflow.id, { onDelete: "cascade" }),
  event_id: uuid("event_id").references(() => eventLog.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("pending"),
  trigger_source: text("trigger_source").notNull(),
  run_after: timestamp("run_after", { withTimezone: true })
    .notNull()
    .defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  locked_at: timestamp("locked_at", { withTimezone: true }),
  last_error: text("last_error"),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  depth: integer("depth").notNull().default(0),
  actor_user_id: uuid("actor_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  request_id: text("request_id"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WorkflowSchedule = InferSelectModel<typeof workflowSchedule>;

export type WorkflowRunStepResult = {
  type: string;
  label?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  skipped?: boolean;
};

export const workflowRun = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  workflow_id: uuid("workflow_id")
    .notNull()
    .references(() => workflow.id, { onDelete: "cascade" }),
  schedule_id: uuid("schedule_id").references(() => workflowSchedule.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull(),
  steps: jsonb("steps")
    .$type<WorkflowRunStepResult[]>()
    .notNull()
    .default([]),
  error: text("error"),
  started_at: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finished_at: timestamp("finished_at", { withTimezone: true }),
});

export type WorkflowRun = InferSelectModel<typeof workflowRun>;

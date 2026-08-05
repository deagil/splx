import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { workspaceApp } from "@/lib/db/schema";
import { readLocalEnv, upsertLocalEnv } from "@/lib/server/local-env";
import type { TenantContext } from "@/lib/server/tenant/context";

const leadingSlashRegex = /^\//;

export const workspaceAppTypeSchema = z.enum(["postgres", "openai"]);
export type WorkspaceAppType = z.infer<typeof workspaceAppTypeSchema>;

const sslModeSchema = z
  .enum(["prefer", "require", "disable"])
  .default("prefer");

const postgresConfigSchema = z.object({
  database: z.string().min(1, "Database name is required"),
  host: z.string().min(1, "Host is required"),
  password: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65_535).default(5432),
  schema: z.string().optional(),
  sslMode: sslModeSchema,
  username: z.string().min(1, "Username is required"),
});

const openAiConfigSchema = z.object({
  apiKey: z.string().min(8, "API key is required"),
  organization: z.string().optional(),
});

export type PostgresConfigInput = z.infer<typeof postgresConfigSchema>;
export type OpenAiConfigInput = z.infer<typeof openAiConfigSchema>;

export interface ConnectedAppSummary {
  configured: boolean;
  id?: string;
  metadata?: Record<string, unknown>;
  source: "database" | "env";
  type: WorkspaceAppType;
  updatedAt?: string;
}

type WorkspaceAppRow = typeof workspaceApp.$inferSelect;

export async function getWorkspaceAppSummary(
  tenant: TenantContext,
  type: WorkspaceAppType
): Promise<ConnectedAppSummary> {
  if (tenant.mode === "local") {
    return getLocalWorkspaceAppSummary(type);
  }
  return getHostedWorkspaceAppSummary(tenant.workspaceId, type);
}

export async function savePostgresWorkspaceApp(
  tenant: TenantContext,
  payload: unknown
): Promise<ConnectedAppSummary> {
  const input = postgresConfigSchema.parse(payload);

  const connectionString = buildPostgresConnectionString(input);

  if (tenant.mode === "local") {
    await upsertLocalEnv({
      DATABASE_URL: connectionString,
      POSTGRES_URL: connectionString,
    });
    return {
      configured: true,
      metadata: buildPostgresMetadataFromInput(input),
      source: "env",
      type: "postgres",
      updatedAt: new Date().toISOString(),
    };
  }

  const metadata = {
    ...buildPostgresMetadataFromInput(input),
    updatedAt: new Date().toISOString(),
    updatedBy: tenant.userId,
  };

  await upsertWorkspaceApp({
    credentialRef: connectionString,
    metadata,
    type: "postgres",
    workspaceId: tenant.workspaceId,
  });

  return getHostedWorkspaceAppSummary(tenant.workspaceId, "postgres");
}

export async function saveOpenAiWorkspaceApp(
  tenant: TenantContext,
  payload: unknown
): Promise<ConnectedAppSummary> {
  const input = openAiConfigSchema.parse(payload);
  const sanitizedKey = input.apiKey.trim();

  if (tenant.mode === "local") {
    await upsertLocalEnv({ OPENAI_API_KEY: sanitizedKey });
    return {
      configured: true,
      metadata: {
        maskedKey: maskSecret(sanitizedKey),
        organization: input.organization ?? null,
        provider: "openai",
      },
      source: "env",
      type: "openai",
      updatedAt: new Date().toISOString(),
    };
  }

  const metadata = {
    maskedKey: maskSecret(sanitizedKey),
    organization: input.organization ?? null,
    provider: "openai",
    updatedAt: new Date().toISOString(),
    updatedBy: tenant.userId,
  };

  await upsertWorkspaceApp({
    credentialRef: sanitizedKey,
    metadata,
    type: "openai",
    workspaceId: tenant.workspaceId,
  });

  return getHostedWorkspaceAppSummary(tenant.workspaceId, "openai");
}

async function getHostedWorkspaceAppSummary(
  workspaceId: string,
  type: WorkspaceAppType
): Promise<ConnectedAppSummary> {
  const record = await findWorkspaceApp(workspaceId, type);
  if (!record) {
    return {
      configured: false,
      source: "database",
      type,
    };
  }

  return {
    configured: true,
    id: record.id,
    metadata: record.metadata ?? {},
    source: "database",
    type,
    updatedAt: serializeDate(record.updated_at),
  };
}

async function getLocalWorkspaceAppSummary(
  type: WorkspaceAppType
): Promise<ConnectedAppSummary> {
  if (type === "postgres") {
    const env = await readLocalEnv(["POSTGRES_URL", "DATABASE_URL"]);
    const connectionString = env.POSTGRES_URL ?? env.DATABASE_URL;
    if (!connectionString) {
      return {
        configured: false,
        source: "env",
        type,
      };
    }

    return {
      configured: true,
      metadata: {
        ...buildPostgresMetadataFromConnectionString(connectionString),
        connectionString,
      },
      source: "env",
      type,
    };
  }

  const env = await readLocalEnv(["OPENAI_API_KEY"]);
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      source: "env",
      type,
    };
  }

  return {
    configured: true,
    metadata: {
      maskedKey: maskSecret(apiKey),
      provider: "openai",
    },
    source: "env",
    type,
  };
}

async function findWorkspaceApp(
  workspaceId: string,
  type: WorkspaceAppType
): Promise<WorkspaceAppRow | undefined> {
  return withDb((db) => findWorkspaceAppWithDb(db, workspaceId, type));
}

async function findWorkspaceAppWithDb(
  db: ReturnType<typeof drizzle>,
  workspaceId: string,
  type: WorkspaceAppType
): Promise<WorkspaceAppRow | undefined> {
  const [record] = await db
    .select()
    .from(workspaceApp)
    .where(
      and(
        eq(workspaceApp.workspace_id, workspaceId),
        eq(workspaceApp.type, type)
      )
    )
    .limit(1);

  return record;
}

async function upsertWorkspaceApp(options: {
  workspaceId: string;
  type: WorkspaceAppType;
  credentialRef: string;
  metadata: Record<string, unknown>;
}) {
  await withDb(async (db) => {
    const existing = await findWorkspaceAppWithDb(
      db,
      options.workspaceId,
      options.type
    );

    if (existing) {
      await db
        .update(workspaceApp)
        .set({
          credential_ref: options.credentialRef,
          metadata: options.metadata,
          updated_at: new Date(),
        })
        .where(eq(workspaceApp.id, existing.id));
      return;
    }

    await db.insert(workspaceApp).values({
      credential_ref: options.credentialRef,
      metadata: options.metadata,
      type: options.type,
      workspace_id: options.workspaceId,
    });
  });
}

function buildPostgresConnectionString(config: PostgresConfigInput): string {
  const user = encodeURIComponent(config.username);
  const password = config.password
    ? `:${encodeURIComponent(config.password)}`
    : "";
  const schemaParam = config.schema
    ? `?schema=${encodeURIComponent(config.schema)}`
    : "";
  return `postgresql://${user}${password}@${config.host}:${config.port}/${config.database}${schemaParam}`;
}

function buildPostgresMetadataFromInput(
  input: PostgresConfigInput
): Record<string, unknown> {
  return {
    database: input.database,
    host: input.host,
    port: input.port,
    schema: input.schema ?? null,
    sslMode: input.sslMode,
    username: input.username,
    variant: "postgres",
  };
}

function buildPostgresMetadataFromConnectionString(
  connectionString: string
): Record<string, unknown> {
  try {
    const url = new URL(connectionString);
    const schema = url.searchParams.get("schema");
    return {
      database: url.pathname.replace(leadingSlashRegex, ""),
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      schema: schema ?? null,
      username: decodeURIComponent(url.username),
      variant: "postgres",
    };
  } catch {
    return {
      variant: "postgres",
    };
  }
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "****";
  }

  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}****${suffix}`;
}

function serializeDate(
  value: Date | string | null | undefined
): string | undefined {
  if (!value) {
    return;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

async function withDb<T>(
  callback: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const sql = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(sql);

  try {
    return await callback(db);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

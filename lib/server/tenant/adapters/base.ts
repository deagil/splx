import { drizzle } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";

export type DbClient = ReturnType<typeof drizzle>;

export type ResourceAdapterKind =
  | "local"
  | "postgres"
  | "neon"
  | "planetscale"
  | "zapier";

export interface AdapterContext {
  configuration?: Record<string, unknown>;
  connectionId?: string | null;
  credentialRef?: string | null;
  workspaceId: string;
}

export interface ResourceAdapter {
  dispose: () => Promise<void>;
  initialize: () => Promise<void>;
  readonly kind: ResourceAdapterKind;
  readonly workspaceId: string;
}

export interface SqlResourceAdapter extends ResourceAdapter {
  withDb: <T>(callback: (db: DbClient) => Promise<T>) => Promise<T>;
}

export abstract class BaseSqlAdapter implements SqlResourceAdapter {
  protected sqlClient: Sql | null = null;
  protected dbClient: DbClient | null = null;

  // Public: subclasses such as LocalSqlAdapter declare no constructor of their
  // own, so they inherit this one and are instantiated from other modules.
  constructor(protected readonly context: AdapterContext) {}

  abstract readonly kind: ResourceAdapterKind;

  protected abstract createSqlClient(): Promise<Sql> | Sql;

  get workspaceId(): string {
    return this.context.workspaceId;
  }

  async initialize(): Promise<void> {
    if (!this.sqlClient) {
      await this.ensureConnections();
    }
  }

  async withDb<T>(callback: (db: DbClient) => Promise<T>): Promise<T> {
    await this.ensureConnections();
    if (!this.dbClient) {
      throw new Error("Failed to initialize database client");
    }
    return callback(this.dbClient);
  }

  async dispose(): Promise<void> {
    if (this.sqlClient) {
      try {
        await this.sqlClient.end({ timeout: 5 });
      } catch {
        // ignore cleanup errors
      } finally {
        this.sqlClient = null;
        this.dbClient = null;
      }
    }
  }

  private async ensureConnections() {
    if (this.sqlClient && this.dbClient) {
      return;
    }

    this.sqlClient = await this.createSqlClient();
    this.dbClient = drizzle(this.sqlClient);
  }
}

export function isSqlAdapter(
  adapter: ResourceAdapter
): adapter is SqlResourceAdapter {
  return typeof (adapter as SqlResourceAdapter).withDb === "function";
}

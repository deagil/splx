import { and, eq, sql } from "drizzle-orm";
import { table as tableConfigTable } from "@/lib/db/schema";
import {
  buildSelectQuery,
  countRecords,
  executeSelectQuery,
  getRecordById,
  type QueryOptions,
} from "@/lib/server/tables/query-builder";
import {
  type TableRecord,
  tableRecordSchema,
} from "@/lib/server/tables/schema";
import type { DbClient, TenantContext } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { ApiError } from "@/server/api/responses";
import { writeAuditLog } from "@/server/lib/audit";
import { getControlPlaneDb } from "@/server/lib/db";
import { emitEvent } from "@/server/lib/events";

/**
 * Row CRUD for dynamic user tables, with validation, audit, and technical
 * events built in.
 *
 * This replaces the hand-rolled SQL in `app/api/data/[tableName]/route.ts`,
 * which had three defects this module exists to fix:
 *
 * 1. **SQL injection.** The old POST/PATCH interpolated any non-string, non-null
 *    JSON value with `String(value)` / bare `${value}` straight into
 *    `sql.raw()`. Only strings and nulls were escaped, so a body of
 *    `{"qty": ["1); DROP TABLE x; --"]}` was injected verbatim. Every value
 *    here is a bound parameter; only identifiers are interpolated, and only
 *    after being matched against the table's real columns.
 * 2. **Arbitrary column writes.** The old code fetched the table config purely
 *    as a 404 gate and never looked at its columns, so a caller could write to
 *    `workspace_id`, `id`, or anything else the UI never exposed.
 * 3. **No audit trail.** Mutations left no record.
 *
 * Validation is against the table's *real* columns from `information_schema`,
 * not `config.field_metadata` — the latter is `.optional().default([])`
 * (lib/server/tables/schema.ts:71), so most tables would validate against an
 * empty list and reject every write.
 */

export interface DataRepositoryContext {
  /** When set, threaded into emitEvent for the workflow recursion guard. */
  causedByRunId?: string | null;
  requestId?: string;
  tenant: TenantContext;
}

interface ResolvedTable {
  columns: string[];
  config: TableRecord;
  /**
   * True when the physical table actually carries a `workspace_id` column, in
   * which case reads and writes are additionally scoped by it.
   */
  hasWorkspaceColumn: boolean;
  /** Physical table name in the resource store. */
  physicalName: string;
  primaryKey: string;
}

const MAX_LIMIT = 1000;

/**
 * Resolves the table config and introspects the physical table.
 *
 * The path segment is the table config **id**. `/api/tables/sync` sets
 * `id === name === physical table name`, and the page-block generator emits
 * `/api/data/${tableConfig.id}` — so the id is the physical name today. We
 * still verify it against `information_schema.tables` rather than trusting it,
 * which doubles as the identifier allowlist for every statement below.
 */
/**
 * Loads table config via the privileged control-plane connection.
 *
 * Prefer this over the cookie-scoped Supabase client so the workflow worker
 * (no user session) and HTTP handlers share one path.
 */
async function loadTableConfig(
  workspaceId: string,
  tableId: string
): Promise<TableRecord | null> {
  const rows = await getControlPlaneDb()
    .select()
    .from(tableConfigTable)
    .where(
      and(
        eq(tableConfigTable.workspace_id, workspaceId),
        eq(tableConfigTable.id, tableId)
      )
    )
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  const parsed = tableRecordSchema.safeParse({
    ...row,
    config: row.config ?? {},
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  });

  if (!parsed.success) {
    throw new ApiError(500, "Invalid table configuration");
  }

  return parsed.data;
}

async function resolveTable(
  db: DbClient,
  tenant: TenantContext,
  tableId: string
): Promise<ResolvedTable> {
  const config = await loadTableConfig(tenant.workspaceId, tableId);
  if (!config) {
    throw new ApiError(404, "Table configuration not found");
  }

  // The old route used the path segment (the config id) directly as the
  // physical table name, and `/api/tables/sync` sets id === name === physical
  // name. Prefer the id to preserve that behaviour exactly, falling back to the
  // config name for tables registered under a different id.
  const candidates =
    config.name && config.name !== config.id
      ? [config.id, config.name]
      : [config.id];

  const tableRows = (await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (${sql.join(
        candidates.map((candidate) => sql`${candidate}`),
        sql`, `
      )})
  `)) as Array<{ table_name: string }>;

  const found = new Set(tableRows.map((row) => row.table_name));
  const physicalName = candidates.find((candidate) => found.has(candidate));

  if (!physicalName) {
    throw new ApiError(404, "Table not found in resource store");
  }

  const columnRows = (await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${physicalName}
    ORDER BY ordinal_position
  `)) as Array<{ column_name: string }>;

  const columns = columnRows.map((row) => row.column_name);

  if (columns.length === 0) {
    throw new ApiError(404, "Table not found in resource store");
  }

  const primaryKey = config.config.primary_key_column ?? "id";
  if (!columns.includes(primaryKey)) {
    throw new ApiError(
      500,
      `Table "${physicalName}" has no primary key column "${primaryKey}"`
    );
  }

  return {
    columns,
    config,
    hasWorkspaceColumn: columns.includes("workspace_id"),
    physicalName,
    primaryKey,
  };
}

/**
 * Rejects any body key that is not a real column.
 *
 * Note this returns the *validated* key list; callers must only ever build SQL
 * from these, never from raw body keys.
 */
function validateWriteKeys(
  table: ResolvedTable,
  body: Record<string, unknown>
): string[] {
  const keys = Object.keys(body);
  const unknown = keys.filter((key) => !table.columns.includes(key));

  if (unknown.length > 0) {
    throw new ApiError(
      400,
      `Unknown column(s) for table "${table.physicalName}": ${unknown.join(", ")}`
    );
  }

  // workspace_id is set by the repository, never by the caller — otherwise a
  // caller could write rows into another workspace on a shared physical table.
  if (table.hasWorkspaceColumn && keys.includes("workspace_id")) {
    throw new ApiError(400, "workspace_id is managed by the server");
  }

  return keys;
}

/**
 * Values are bound as parameters. Objects and arrays are serialised to JSON so
 * that jsonb columns work; everything else is passed through for the driver to
 * bind.
 */
function bindValue(value: unknown) {
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value);
  }
  return value;
}

function workspacePredicate(table: ResolvedTable, workspaceId: string) {
  if (!table.hasWorkspaceColumn) {
    return null;
  }
  return sql`${sql.identifier("workspace_id")} = ${workspaceId}`;
}

function rowPredicates(
  table: ResolvedTable,
  recordId: string,
  workspaceId: string
) {
  const predicates = [sql`${sql.identifier(table.primaryKey)} = ${recordId}`];
  const wsPredicate = workspacePredicate(table, workspaceId);
  if (wsPredicate) {
    predicates.push(wsPredicate);
  }
  return predicates;
}

/**
 * SQL builders, kept pure so the injection behaviour can be asserted directly
 * in unit tests without a database.
 *
 * The invariant every one of these upholds: identifiers are interpolated only
 * after being matched against `information_schema` columns, and *no* caller
 * supplied value is ever interpolated — values become bound parameters.
 */
export function buildInsert(
  table: ResolvedTable,
  body: Record<string, unknown>,
  workspaceId: string
) {
  const keys = validateWriteKeys(table, body);

  if (keys.length === 0) {
    throw new ApiError(400, "Request body must contain at least one field");
  }

  const columns = keys.map((key) => sql`${sql.identifier(key)}`);
  const values = keys.map((key) => sql`${bindValue(body[key])}`);

  if (table.hasWorkspaceColumn) {
    columns.push(sql`${sql.identifier("workspace_id")}`);
    values.push(sql`${workspaceId}`);
  }

  return sql`
    INSERT INTO ${sql.identifier(table.physicalName)}
      (${sql.join(columns, sql`, `)})
    VALUES (${sql.join(values, sql`, `)})
    RETURNING *
  `;
}

export function buildUpdate(
  table: ResolvedTable,
  recordId: string,
  body: Record<string, unknown>,
  workspaceId: string
) {
  const keys = validateWriteKeys(table, body);

  if (keys.length === 0) {
    throw new ApiError(400, "Request body must contain at least one field");
  }

  const assignments = keys.map(
    (key) => sql`${sql.identifier(key)} = ${bindValue(body[key])}`
  );

  return sql`
    UPDATE ${sql.identifier(table.physicalName)}
    SET ${sql.join(assignments, sql`, `)}
    WHERE ${sql.join(rowPredicates(table, recordId, workspaceId), sql` AND `)}
    RETURNING *
  `;
}

export function buildDelete(
  table: ResolvedTable,
  recordId: string,
  workspaceId: string
) {
  return sql`
    DELETE FROM ${sql.identifier(table.physicalName)}
    WHERE ${sql.join(rowPredicates(table, recordId, workspaceId), sql` AND `)}
    RETURNING *
  `;
}

export function parsePagination(query: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const rawLimit = query.get("limit");
  const rawOffset = query.get("offset");

  const limit = rawLimit === null ? 100 : Number(rawLimit);
  const offset = rawOffset === null ? 0 : Number(rawOffset);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ApiError(
      400,
      `limit must be an integer between 1 and ${MAX_LIMIT}`
    );
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new ApiError(400, "offset must be a non-negative integer");
  }

  return { limit, offset };
}

export function parseOrderDirection(value: string | null): "asc" | "desc" {
  if (value === null || value === "asc") {
    return "asc";
  }
  if (value === "desc") {
    return "desc";
  }
  throw new ApiError(400, 'orderDirection must be "asc" or "desc"');
}

export interface ListOptions {
  filters: Record<string, unknown>;
  includeLabels: boolean;
  limit: number;
  offset: number;
  orderBy?: string;
  orderDirection: "asc" | "desc";
}

export interface ListResult {
  records: Record<string, unknown>[];
  total: number;
}

/**
 * The repository. One instance per (tenant, table) pair; each method opens and
 * disposes a resource-store connection.
 */
export function dataRepository(context: DataRepositoryContext) {
  const { tenant, requestId, causedByRunId } = context;

  async function withStore<T>(fn: (db: DbClient) => Promise<T>): Promise<T> {
    const store = await getResourceStore(tenant);
    try {
      return await store.withSqlClient(fn);
    } finally {
      await store.dispose();
    }
  }

  return {
    async create(
      tableId: string,
      body: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
      return withStore(async (db) => {
        const table = await resolveTable(db, tenant, tableId);

        const rows = (await db.execute(
          buildInsert(table, body, tenant.workspaceId)
        )) as Record<string, unknown>[];

        const [record] = rows;

        await writeAuditLog({
          action: "data.created",
          actorUserId: tenant.userId,
          changes: body,
          requestId,
          resourceId: String(record?.[table.primaryKey] ?? ""),
          resourceType: table.config.id,
          workspaceId: tenant.workspaceId,
        });

        await emitEvent({
          actorUserId: tenant.userId,
          causedByRunId,
          eventName: `db.${table.physicalName}.created`,
          payload: { record },
          requestId,
          workspaceId: tenant.workspaceId,
        });

        return record;
      });
    },

    async get(
      tableId: string,
      recordId: string
    ): Promise<Record<string, unknown> | null> {
      return withStore(async (db) => {
        const table = await resolveTable(db, tenant, tableId);

        const record = (await getRecordById(
          db,
          tenant,
          table.config,
          table.physicalName,
          recordId,
          true
        )) as Record<string, unknown> | null;

        if (!record) {
          return null;
        }

        if (
          table.hasWorkspaceColumn &&
          record.workspace_id !== tenant.workspaceId
        ) {
          return null;
        }

        return record;
      });
    },
    async list(tableId: string, options: ListOptions): Promise<ListResult> {
      return withStore(async (db) => {
        const table = await resolveTable(db, tenant, tableId);

        const unknownFilters = Object.keys(options.filters).filter(
          (key) => !table.columns.includes(key)
        );
        if (unknownFilters.length > 0) {
          throw new ApiError(
            400,
            `Unknown filter column(s): ${unknownFilters.join(", ")}`
          );
        }

        if (options.orderBy && !table.columns.includes(options.orderBy)) {
          throw new ApiError(400, `Unknown orderBy column: ${options.orderBy}`);
        }

        const filters = { ...options.filters };
        if (table.hasWorkspaceColumn) {
          filters.workspace_id = tenant.workspaceId;
        }

        const queryOptions: QueryOptions = {
          filters,
          includeLabels: options.includeLabels,
          limit: options.limit,
          offset: options.offset,
          orderBy: options.orderBy,
          orderDirection: options.orderDirection,
        };

        const { query } = await buildSelectQuery(
          db,
          tenant,
          table.config,
          table.physicalName,
          queryOptions
        );

        const records = (await executeSelectQuery(db, query)) as Record<
          string,
          unknown
        >[];
        const total = await countRecords(db, table.physicalName, filters);

        return { records, total };
      });
    },

    async remove(tableId: string, recordId: string): Promise<boolean> {
      return withStore(async (db) => {
        const table = await resolveTable(db, tenant, tableId);

        const rows = (await db.execute(
          buildDelete(table, recordId, tenant.workspaceId)
        )) as Record<string, unknown>[];

        const [record] = rows;
        if (!record) {
          // The old route returned { success: true } unconditionally, so
          // deleting a nonexistent id reported success.
          return false;
        }

        await writeAuditLog({
          action: "data.deleted",
          actorUserId: tenant.userId,
          changes: { deleted: record },
          requestId,
          resourceId: recordId,
          resourceType: table.config.id,
          workspaceId: tenant.workspaceId,
        });

        await emitEvent({
          actorUserId: tenant.userId,
          causedByRunId,
          eventName: `db.${table.physicalName}.deleted`,
          payload: { record },
          requestId,
          workspaceId: tenant.workspaceId,
        });

        return true;
      });
    },

    async update(
      tableId: string,
      recordId: string,
      body: Record<string, unknown>
    ): Promise<Record<string, unknown> | null> {
      return withStore(async (db) => {
        const table = await resolveTable(db, tenant, tableId);

        const rows = (await db.execute(
          buildUpdate(table, recordId, body, tenant.workspaceId)
        )) as Record<string, unknown>[];

        const [record] = rows;
        if (!record) {
          return null;
        }

        await writeAuditLog({
          action: "data.updated",
          actorUserId: tenant.userId,
          changes: body,
          requestId,
          resourceId: recordId,
          resourceType: table.config.id,
          workspaceId: tenant.workspaceId,
        });

        await emitEvent({
          actorUserId: tenant.userId,
          causedByRunId,
          eventName: `db.${table.physicalName}.updated`,
          payload: { changes: body, record },
          requestId,
          workspaceId: tenant.workspaceId,
        });

        return record;
      });
    },
  };
}

export type DataRepository = ReturnType<typeof dataRepository>;

export type { ResolvedTable };

/** Exported for unit tests. */
export const __testing = {
  bindValue,
  validateWriteKeys,
};

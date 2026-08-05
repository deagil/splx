import { z } from "zod";
import { endpoint } from "@/server/api/endpoint";
import { ApiError } from "@/server/api/responses";
import {
  dataRepository,
  parseOrderDirection,
  parsePagination,
} from "@/server/repositories/data";

/**
 * Row CRUD for dynamic user tables.
 *
 * The `[tableName]` path segment is the **table config id**. `/api/tables/sync`
 * sets `id === name === physical table name`, and the page-block generator
 * emits `/api/data/${tableConfig.id}`, so the two coincide today. The
 * repository resolves the physical name from the config and verifies it against
 * `information_schema` rather than trusting the path.
 *
 * Record id is passed as `?id=` to match the existing contract.
 */

interface Params {
  tableName: string;
}

const RESERVED_QUERY_KEYS = new Set([
  "id",
  "limit",
  "offset",
  "orderBy",
  "orderDirection",
  "includeLabels",
  "workspaceId",
]);

/**
 * Bodies are validated against the table's real columns inside the repository,
 * which is the only place that knows them. This schema enforces the envelope:
 * a JSON object, not an array or scalar.
 */
const rowSchema = z.record(z.string(), z.unknown());

function requireRecordId(query: URLSearchParams): string {
  const recordId = query.get("id");
  if (!recordId) {
    throw new ApiError(400, "Record ID is required");
  }
  return recordId;
}

export const GET = endpoint<undefined, Params, unknown>({
  auth: "required",
  async handler({ user, params, query, requestId }) {
    const repo = dataRepository({ requestId, tenant: user.tenant });
    const recordId = query.get("id");

    if (recordId) {
      const record = await repo.get(params.tableName, recordId);
      if (!record) {
        throw new ApiError(404, "Record not found");
      }
      return { data: { record } };
    }

    const { limit, offset } = parsePagination(query);
    const orderDirection = parseOrderDirection(query.get("orderDirection"));
    const orderBy = query.get("orderBy") ?? undefined;
    const includeLabels = query.get("includeLabels") !== "false";

    const filters: Record<string, unknown> = {};
    for (const [key, value] of query.entries()) {
      if (!RESERVED_QUERY_KEYS.has(key)) {
        filters[key] = value;
      }
    }

    const { records, total } = await repo.list(params.tableName, {
      filters,
      includeLabels,
      limit,
      offset,
      orderBy,
      orderDirection,
    });

    return {
      data: { records },
      meta: {
        pagination: {
          hasMore: offset + limit < total,
          limit,
          offset,
          total,
        },
      },
    };
  },
  permission: "data.view",
});

export const POST = endpoint<Record<string, unknown>, Params, unknown>({
  auth: "required",
  async handler({ user, params, body, requestId }) {
    const repo = dataRepository({ requestId, tenant: user.tenant });
    const record = await repo.create(params.tableName, body);
    return { data: { record }, status: 201 };
  },
  permission: "data.create",
  schema: rowSchema,
});

export const PATCH = endpoint<Record<string, unknown>, Params, unknown>({
  auth: "required",
  async handler({ user, params, body, query, requestId }) {
    const recordId = requireRecordId(query);
    const repo = dataRepository({ requestId, tenant: user.tenant });

    const record = await repo.update(params.tableName, recordId, body);
    if (!record) {
      throw new ApiError(404, "Record not found");
    }

    return { data: { record } };
  },
  permission: "data.edit",
  schema: rowSchema,
});

export const DELETE = endpoint<undefined, Params, unknown>({
  auth: "required",
  async handler({ user, params, query, requestId }) {
    const recordId = requireRecordId(query);
    const repo = dataRepository({ requestId, tenant: user.tenant });

    const deleted = await repo.remove(params.tableName, recordId);
    if (!deleted) {
      throw new ApiError(404, "Record not found");
    }

    return { data: { success: true } };
  },
  permission: "data.delete",
});

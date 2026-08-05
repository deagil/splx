import { NextResponse } from "next/server";
import {
  DELETE as v1Delete,
  GET as v1Get,
  PATCH as v1Patch,
  POST as v1Post,
} from "@/app/api/v1/data/[tableName]/route";

/**
 * Legacy row CRUD endpoint — delegates to `/api/v1/data/[tableName]`.
 *
 * The hand-rolled SQL that used to live here is gone; see
 * `server/repositories/data.ts` for what replaced it and why (it had a live SQL
 * injection in POST and PATCH).
 *
 * This shim exists only to keep existing callers working while they migrate:
 * the page-block generator emits `/api/data/${tableConfig.id}` into saved page
 * configs (`lib/server/tables/pages/templates.ts`), so those URLs are persisted
 * in the `pages` table and cannot be changed by editing code alone.
 *
 * It translates the v1 `{ data, meta }` envelope back to the old flat shape.
 * Delete this file once saved page configs point at `/api/v1/`.
 */

type Params = { tableName: string };
type RouteContext = { params: Promise<Params> };

type V1Body = {
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: string;
  issues?: unknown;
  requestId?: string;
};

/**
 * Flattens `{ data: {...}, meta: { pagination } }` into the legacy shape.
 * Error responses are passed through untouched — they were already
 * `{ error: ... }`, and the status codes are strictly more correct now
 * (401 instead of 500 for an expired session, 400 instead of 500 for bad input).
 */
async function unwrap(response: Response): Promise<Response> {
  if (response.status === 204) {
    return response;
  }

  let body: V1Body;
  try {
    body = (await response.clone().json()) as V1Body;
  } catch {
    return response;
  }

  if (!body || typeof body !== "object" || body.data === undefined) {
    return response;
  }

  const flattened: Record<string, unknown> = { ...body.data };
  const pagination = body.meta?.pagination;
  if (pagination !== undefined) {
    flattened.pagination = pagination;
  }

  return NextResponse.json(flattened, { status: response.status });
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  return unwrap(await v1Get(request, context));
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  return unwrap(await v1Post(request, context));
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<Response> {
  return unwrap(await v1Patch(request, context));
}

export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<Response> {
  return unwrap(await v1Delete(request, context));
}

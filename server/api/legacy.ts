import { NextResponse } from "next/server";

/**
 * Adapters that keep pre-v1 URLs working while their callers migrate.
 *
 * The control plane returns `{ data, meta? }`; the routes these replace
 * returned flat objects like `{ page }` or `{ records, pagination }`. Rather
 * than change every fetch call site in one go, each legacy path delegates to
 * its v1 handler and flattens the envelope back.
 *
 * Error bodies pass through untouched — they were already `{ error }`, and the
 * status codes are strictly more correct now (401 instead of 500 for an expired
 * session, 400 instead of 500 for malformed input).
 *
 * Delete a delegator once nothing fetches its path.
 */

type V1Body = {
  data?: unknown;
  meta?: Record<string, unknown>;
};

/**
 * Flattens `{ data: {...}, meta: { pagination } }` to `{ ...data, pagination }`.
 *
 * When `data` is not an object (an array, or a scalar), it cannot be spread
 * into the legacy shape, so the response is returned as-is — callers of such
 * routes have to move to v1.
 */
export async function unwrapEnvelope(response: Response): Promise<Response> {
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

  if (
    body.data === null ||
    typeof body.data !== "object" ||
    Array.isArray(body.data)
  ) {
    return response;
  }

  const flattened: Record<string, unknown> = {
    ...(body.data as Record<string, unknown>),
  };

  const pagination = body.meta?.pagination;
  if (pagination !== undefined) {
    flattened.pagination = pagination;
  }

  return NextResponse.json(flattened, { status: response.status });
}

type RouteHandler<TParams> = (
  req: Request,
  context: { params: Promise<TParams> }
) => Promise<Response>;

/** Wraps a v1 handler so a legacy path serves the old flat response shape. */
export function delegateToV1<TParams>(
  handler: RouteHandler<TParams>
): RouteHandler<TParams> {
  return async (req, context) => unwrapEnvelope(await handler(req, context));
}

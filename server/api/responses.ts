import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ReservedTableNameError, TableNotFoundError } from "@/lib/server/tables";

/**
 * Shared error and success shapes for the API control plane.
 *
 * Replaces the ten copy-pasted `handleError` functions in `app/api/**` and the
 * dozen inline `{ error: "Unauthorized" }, { status: 401 }` literals.
 *
 * Two behaviours differ deliberately from the copies being replaced:
 *
 * 1. `Error("Unauthorized")` — thrown by `resolveTenantContext()` — now maps to
 *    401. Every copy fell through to the generic branch and returned 500.
 * 2. Unrecognised errors return a generic message. The copies returned
 *    `{ error: error.message }`, which leaked internals (including SQL text and
 *    connection strings) to the client. The real error is logged server-side.
 */

export type ErrorBody = {
  error: string;
  issues?: Array<{ path: string; message: string }>;
  requestId?: string;
};

export function unauthorized(requestId?: string): NextResponse<ErrorBody> {
  return NextResponse.json(
    { error: "Unauthorized", requestId },
    { status: 401 }
  );
}

export function forbidden(requestId?: string): NextResponse<ErrorBody> {
  return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
}

export function notFound(
  message = "Not found",
  requestId?: string
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message, requestId }, { status: 404 });
}

export function badRequest(
  message: string,
  requestId?: string
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message, requestId }, { status: 400 });
}

/**
 * Thrown by handlers and repositories that want to control the status code
 * without reaching for a `NextResponse`.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const AUTH_ERROR_MESSAGES = new Set(["Unauthorized"]);

const FORBIDDEN_ERROR_MESSAGES = new Set([
  "Forbidden",
  "Workspace membership required",
  "Missing role assignment for workspace",
  "Unable to resolve workspace context",
]);

export function handleError(
  error: unknown,
  requestId?: string
): NextResponse<ErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, requestId },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        requestId,
      },
      { status: 400 }
    );
  }

  if (error instanceof TableNotFoundError) {
    return notFound("Table not found", requestId);
  }

  if (error instanceof ReservedTableNameError) {
    return badRequest(error.message, requestId);
  }

  if (error instanceof Error) {
    if (AUTH_ERROR_MESSAGES.has(error.message)) {
      return unauthorized(requestId);
    }

    if (FORBIDDEN_ERROR_MESSAGES.has(error.message)) {
      return forbidden(requestId);
    }
  }

  // Unrecognised: log the detail, return a generic message.
  console.error("[api] unhandled error", {
    requestId,
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });

  return NextResponse.json(
    { error: "Internal server error", requestId },
    { status: 500 }
  );
}

export function success<TData>(
  data: TData,
  options: { meta?: Record<string, unknown>; status?: number } = {}
): NextResponse<{ data: TData; meta?: Record<string, unknown> }> {
  const body: { data: TData; meta?: Record<string, unknown> } = { data };
  if (options.meta) {
    body.meta = options.meta;
  }
  return NextResponse.json(body, { status: options.status ?? 200 });
}

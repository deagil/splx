import { generateUUID } from "@/lib/utils";
import { checkPermission } from "@/server/permissions/check";
import { resolveEndpointUser } from "./auth";
import { ApiError, handleError, success } from "./responses";
import type { EndpointConfig } from "./types";

/**
 * Structured request log. A `console.log` stub until a real sink exists — the
 * point is that every control-plane request emits one line with a `requestId`
 * that also appears in `audit_logs`, `event_outbox`, and any error response.
 */
function logRequest(entry: {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  workspaceId?: string;
  status: number;
  durationMs: number;
}): void {
  console.log("[api]", JSON.stringify(entry));
}

type RouteHandler<TParams> = (
  req: Request,
  context: { params: Promise<TParams> }
) => Promise<Response>;

/**
 * Wraps a route handler with auth, permission check, body validation, a
 * consistent `{ data, meta? }` envelope, and request logging.
 *
 * Handlers stay orchestration-only: declare what the route needs, then call
 * repositories or `lib/server/*` helpers. Audit writes and technical events
 * belong in the repository, not here, so that non-HTTP callers (AI tools, a
 * future automation runner) get them too.
 */
export function endpoint<TBody = undefined, TParams = unknown, TData = unknown>(
  config: EndpointConfig<TBody, TParams, TData>
): RouteHandler<TParams> {
  return async (req, routeContext) => {
    const requestId = generateUUID();
    const startedAt = Date.now();
    const url = new URL(req.url);

    let status = 200;
    let userId: string | undefined;
    let workspaceId: string | undefined;

    try {
      const user = await resolveEndpointUser(req.headers);
      userId = user.userId;
      workspaceId = user.workspaceId;

      if (config.permission) {
        await checkPermission({
          workspaceId: user.workspaceId,
          roles: user.roles,
          permission: config.permission,
        });
      }

      let body = undefined as TBody;
      if (config.schema) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw new ApiError(400, "Request body must be valid JSON");
        }
        body = config.schema.parse(raw);
      }

      const params = await routeContext.params;

      const result = await config.handler({
        user,
        params,
        body,
        query: url.searchParams,
        req,
        requestId,
      });

      status = result.status ?? 200;
      return success(result.data, { meta: result.meta, status });
    } catch (error) {
      const response = handleError(error, requestId);
      status = response.status;
      return response;
    } finally {
      logRequest({
        requestId,
        method: req.method,
        path: url.pathname,
        userId,
        workspaceId,
        status,
        durationMs: Date.now() - startedAt,
      });
    }
  };
}

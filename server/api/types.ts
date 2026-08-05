import type { AppMode } from "@/lib/app-mode";
import type { TenantContext } from "@/lib/server/tenant/context";
import type { Permission } from "@/server/permissions/definitions";

/**
 * The authenticated caller, as seen by an endpoint handler.
 *
 * This is a narrowed view of {@link TenantContext}: handlers should not need to
 * know how the tenant was resolved, only who is calling and in which workspace.
 */
export interface EndpointUser {
  mode: AppMode;
  roles: string[];
  /**
   * The full tenant context, for the handful of `lib/server/*` helpers that
   * still take a `TenantContext` directly.
   */
  tenant: TenantContext;
  userId: string;
  workspaceId: string;
}

export type EndpointAuthMode = "required";

/**
 * Everything a handler receives. `body` is the parsed Zod output when a schema
 * is declared, and `undefined` otherwise.
 */
export interface EndpointContext<TBody, TParams> {
  body: TBody;
  params: TParams;
  query: URLSearchParams;
  req: Request;
  requestId: string;
  user: EndpointUser;
}

/**
 * What a handler returns. `meta` is optional and is merged into the response
 * envelope alongside `data`.
 */
export interface EndpointResult<TData> {
  data: TData;
  meta?: Record<string, unknown>;
  status?: number;
}

export interface EndpointConfig<TBody, TParams, TData> {
  auth: EndpointAuthMode;
  handler: (
    context: EndpointContext<TBody, TParams>
  ) => Promise<EndpointResult<TData>>;
  permission?: Permission;
  /**
   * Zod schema (or anything with a `.parse`) applied to the JSON body. Omit for
   * methods without a body.
   */
  schema?: { parse: (input: unknown) => TBody };
}

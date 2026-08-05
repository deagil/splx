import type { AppMode } from "@/lib/app-mode";
import type { TenantContext } from "@/lib/server/tenant/context";
import type { Permission } from "@/server/permissions/definitions";

/**
 * The authenticated caller, as seen by an endpoint handler.
 *
 * This is a narrowed view of {@link TenantContext}: handlers should not need to
 * know how the tenant was resolved, only who is calling and in which workspace.
 */
export type EndpointUser = {
  userId: string;
  workspaceId: string;
  roles: string[];
  mode: AppMode;
  /**
   * The full tenant context, for the handful of `lib/server/*` helpers that
   * still take a `TenantContext` directly.
   */
  tenant: TenantContext;
};

export type EndpointAuthMode = "required";

/**
 * Everything a handler receives. `body` is the parsed Zod output when a schema
 * is declared, and `undefined` otherwise.
 */
export type EndpointContext<TBody, TParams> = {
  user: EndpointUser;
  params: TParams;
  body: TBody;
  query: URLSearchParams;
  req: Request;
  requestId: string;
};

/**
 * What a handler returns. `meta` is optional and is merged into the response
 * envelope alongside `data`.
 */
export type EndpointResult<TData> = {
  data: TData;
  meta?: Record<string, unknown>;
  status?: number;
};

export type EndpointConfig<TBody, TParams, TData> = {
  auth: EndpointAuthMode;
  permission?: Permission;
  /**
   * Zod schema (or anything with a `.parse`) applied to the JSON body. Omit for
   * methods without a body.
   */
  schema?: { parse: (input: unknown) => TBody };
  handler: (
    context: EndpointContext<TBody, TParams>
  ) => Promise<EndpointResult<TData>>;
};

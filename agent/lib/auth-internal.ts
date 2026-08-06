/**
 * Session resolution for the Eve channel.
 *
 * This runs inside the Eve Nitro process, not Next, so `next/headers` and
 * `@/lib/supabase/server` are unavailable — everything is derived from the raw
 * `Request`. The Postgres client is a module-level singleton because the Nitro
 * process is long-lived and the session stream endpoint reconnects often; the
 * per-request `postgres()` pattern in `proxy.ts` would be catastrophic here.
 */

import { createServerClient } from "@supabase/ssr";
import postgres from "postgres";

export interface AgentPrincipal {
  email?: string;
  modelId?: string;
  userId: string;
  workspaceId: string;
}

const WORKSPACE_CACHE_TTL_MS = 60_000;

const workspaceCache = new Map<
  string,
  { expiresAt: number; workspaceId: string | null }
>();

let sqlClient: ReturnType<typeof postgres> | null = null;

function getSql(): ReturnType<typeof postgres> {
  if (!sqlClient) {
    const url = process.env.POSTGRES_URL;
    if (!url) {
      throw new Error("POSTGRES_URL is not set");
    }
    sqlClient = postgres(url, { max: 4 });
  }
  return sqlClient;
}

/**
 * Minimal Cookie-header parser. The Supabase SSR client only needs
 * `{ name, value }` pairs, and Nitro hands us the raw header.
 */
function parseCookieHeader(header: string | null): {
  name: string;
  value: string;
}[] {
  if (!header) {
    return [];
  }

  const cookies: { name: string; value: string }[] = [];
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    if (!name) {
      continue;
    }
    const rawValue = part.slice(separator + 1).trim();
    cookies.push({ name, value: decodeURIComponent(rawValue) });
  }
  return cookies;
}

function readCookie(request: Request, name: string): string | undefined {
  return parseCookieHeader(request.headers.get("cookie")).find(
    (cookie) => cookie.name === name
  )?.value;
}

async function queryMembership(
  userId: string,
  requestedWorkspaceId: string | null
): Promise<string | null> {
  const sql = getSql();

  if (requestedWorkspaceId) {
    const requested = await sql<{ workspace_id: string }[]>`
      select workspace_id
      from workspace_users
      where user_id = ${userId}
        and workspace_id = ${requestedWorkspaceId}
      limit 1
    `;
    const match = requested.at(0)?.workspace_id;
    if (match) {
      return match;
    }
    // Requested a workspace the caller is not a member of: fall through to
    // their own memberships rather than trusting the client-supplied value.
  }

  const owned = await sql<{ workspace_id: string }[]>`
    select workspace_id
    from workspace_users
    where user_id = ${userId}
    order by created_at asc
    limit 1
  `;

  return owned.at(0)?.workspace_id ?? null;
}

/**
 * Resolves the caller's workspace, memoised for WORKSPACE_CACHE_TTL_MS.
 *
 * Only the "no explicit workspace requested" answer is cached — an explicit
 * `x-workspace-id` is always validated against `workspace_users`, so a client
 * cannot pin itself to a workspace it has since been removed from.
 */
async function resolveWorkspaceId(
  userId: string,
  requestedWorkspaceId: string | null
): Promise<string | null> {
  if (requestedWorkspaceId) {
    return await queryMembership(userId, requestedWorkspaceId);
  }

  const cached = workspaceCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.workspaceId;
  }

  const workspaceId = await queryMembership(userId, null);
  workspaceCache.set(userId, {
    expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
    workspaceId,
  });
  return workspaceId;
}

function defaultLocalWorkspaceId(): string | null {
  if (process.env.APP_MODE !== "local") {
    return null;
  }
  return (
    process.env.DEFAULT_WORKSPACE_ID ??
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ??
    null
  );
}

/**
 * Reads the Supabase session off the inbound request and resolves the splx
 * tenancy that goes with it. Returns `null` when the caller is unauthenticated
 * or has no workspace membership — Eve's channel auth is fail-closed.
 */
export async function resolveAgentPrincipal(
  request: Request
): Promise<AgentPrincipal | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required by the eve channel"
    );
  }

  const cookies = parseCookieHeader(request.headers.get("cookie"));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll() {
        // The Eve channel never issues a Set-Cookie: session refresh stays the
        // responsibility of the Next app, which owns the auth routes.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const requestedWorkspaceId =
    request.headers.get("x-workspace-id") ??
    readCookie(request, "workspace_id") ??
    defaultLocalWorkspaceId();

  const workspaceId = await resolveWorkspaceId(user.id, requestedWorkspaceId);

  if (!workspaceId) {
    return null;
  }

  return {
    email: user.email,
    modelId: readCookie(request, "chat-model"),
    userId: user.id,
    workspaceId,
  };
}

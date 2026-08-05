import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import { role, workspace, workspaceUser } from "@/lib/db/schema";
import { type AppMode, normalizeAppMode } from "@/lib/app-mode";
import { seedDefaultRoles } from "./default-roles";

export type TenantContext = {
  mode: AppMode;
  workspaceId: string;
  userId: string;
  roles: string[];
  connectionId?: string | null;
};

export type ResolveTenantContextOptions = {
  /**
   * Optional pre-fetched headers. When omitted the current headers() helper will be used.
   */
  headers?: Headers;
  /**
   * Explicit workspace identifier to use.
   */
  workspaceId?: string | null;
  /**
   * Optional resource connection identifier for downstream callers.
   */
  connectionId?: string | null;
};

const DEFAULT_WORKSPACE_SLUG = "default";
export type DbClient = ReturnType<typeof drizzle>;

export { type AppMode } from "@/lib/app-mode";

export function getAppMode(): AppMode {
  return normalizeAppMode(process.env.APP_MODE);
}

export async function resolveTenantContext(
  options: ResolveTenantContextOptions = {},
): Promise<TenantContext> {
  const mode = getAppMode();
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const headerBag = options.headers ?? (await headers());
  const requestedWorkspaceId = options.workspaceId ??
    extractWorkspaceId(headerBag);

  const sql = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(sql);

  try {
    if (mode === "local") {
      const workspaceId = await ensureLocalWorkspace(
        db,
        user.id,
        requestedWorkspaceId,
      );
      const roles = await getRolesForWorkspace(db, user.id, workspaceId);

      return {
        mode,
        workspaceId,
        userId: user.id,
        roles,
        connectionId: options.connectionId ?? null,
      };
    }

    const memberships = await db
      .select({
        workspaceId: workspaceUser.workspace_id,
        role: workspaceUser.role_id,
      })
      .from(workspaceUser)
      .where(eq(workspaceUser.user_id, user.id));

    if (memberships.length === 0) {
      throw new Error("Workspace membership required");
    }

    const selectedWorkspaceId = requestedWorkspaceId ??
      memberships[0]?.workspaceId ??
      (() => {
        throw new Error("Unable to resolve workspace context");
      })();

    const rolesForWorkspace = memberships
      .filter((membership) => membership.workspaceId === selectedWorkspaceId)
      .map((membership) => membership.role);

    if (rolesForWorkspace.length === 0) {
      throw new Error("Missing role assignment for workspace");
    }

    return {
      mode,
      workspaceId: selectedWorkspaceId,
      userId: user.id,
      roles: rolesForWorkspace,
      connectionId: options.connectionId ?? null,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function extractWorkspaceId(headerBag: Headers | undefined): string | null {
  if (!headerBag) {
    return null;
  }

  const headerCandidates = ["x-workspace-id", "x-workspace", "x-tenant-id"];
  for (const headerName of headerCandidates) {
    const value = headerBag.get(headerName);
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * Workspaces the local-mode bootstrap is allowed to auto-enrol a caller into.
 *
 * Local mode is a single-workspace development setup, so the caller signing in
 * for the first time becomes the admin of the default workspace. That is the
 * intended behaviour. What is *not* intended is applying it to an arbitrary
 * workspace id: `x-workspace-id` is client-controlled (proxy.ts forwards the
 * request header verbatim), so auto-enrolling into any requested workspace let
 * any authenticated user become admin of any workspace by guessing its UUID.
 */
function isBootstrapWorkspaceId(workspaceId: string): boolean {
  return (
    workspaceId === process.env.DEFAULT_WORKSPACE_ID ||
    workspaceId === process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID
  );
}

async function hasMembership(
  db: DbClient,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: workspaceUser.id })
    .from(workspaceUser)
    .where(
      and(
        eq(workspaceUser.workspace_id, workspaceId),
        eq(workspaceUser.user_id, userId),
      ),
    )
    .limit(1);

  return Boolean(existing);
}

async function ensureLocalWorkspace(
  db: DbClient,
  userId: string,
  requestedWorkspaceId: string | null,
): Promise<string> {
  if (requestedWorkspaceId) {
    const [requestedWorkspace] = await db
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.id, requestedWorkspaceId))
      .limit(1);

    if (requestedWorkspace) {
      // Only auto-enrol for the configured bootstrap workspace. For any other
      // requested workspace the caller must already be a member.
      if (
        isBootstrapWorkspaceId(requestedWorkspace.id) ||
        (await hasMembership(db, requestedWorkspace.id, userId))
      ) {
        await seedDefaultRoles(db, requestedWorkspace.id);
        await ensureMembership(db, requestedWorkspace.id, userId);
        return requestedWorkspace.id;
      }

      throw new Error("Forbidden");
    }
    // If the requested workspace doesn't exist, fall back to the default flow below
  }

  // Bootstrap path: local mode is a single-workspace development setup, so a
  // caller with no workspace hint lands in the "default" workspace and is
  // enrolled as admin. This is deliberate — it is what makes `pnpm dev` work on
  // a fresh checkout — but it does mean *any* authenticated user gets admin on
  // the default local workspace. Do not run APP_MODE=local anywhere that treats
  // its workspaces as a security boundary. See docs/DATABASE_ARCHITECTURE.md.
  const [existingWorkspace] = await db
    .select({
      id: workspace.id,
    })
    .from(workspace)
    .where(eq(workspace.slug, DEFAULT_WORKSPACE_SLUG))
    .limit(1);

  if (existingWorkspace) {
    await seedDefaultRoles(db, existingWorkspace.id);
    await ensureMembership(db, existingWorkspace.id, userId);
    return existingWorkspace.id;
  }

  const [createdWorkspace] = await db
    .insert(workspace)
    .values({
      name: "Local Workspace",
      slug: DEFAULT_WORKSPACE_SLUG,
      owner_user_id: userId,
      mode: "local",
      metadata: {},
    })
    .returning({
      id: workspace.id,
    });

  await seedDefaultRoles(db, createdWorkspace.id);
  await ensureMembership(db, createdWorkspace.id, userId);

  return createdWorkspace.id;
}

async function ensureMembership(
  db: DbClient,
  workspaceId: string,
  userId: string,
) {
  const [existingMembership] = await db
    .select({ id: workspaceUser.id })
    .from(workspaceUser)
    .where(
      and(
        eq(workspaceUser.workspace_id, workspaceId),
        eq(workspaceUser.user_id, userId),
      ),
    )
    .limit(1);

  if (!existingMembership) {
    await seedDefaultRoles(db, workspaceId);

    const [adminRole] = await db
      .select({ id: role.id })
      .from(role)
      .where(
        and(
          eq(role.workspace_id, workspaceId),
          eq(role.id, "admin"),
        ),
      )
      .limit(1);

    if (!adminRole) {
      throw new Error(
        `Missing admin role for workspace ${workspaceId}; seeding failed`,
      );
    }

    await db
      .insert(workspaceUser)
      .values({
        workspace_id: workspaceId,
        user_id: userId,
        role_id: "admin",
        metadata: {},
      })
      .onConflictDoNothing();
  }
}

async function getRolesForWorkspace(
  db: DbClient,
  userId: string,
  workspaceId: string,
): Promise<string[]> {
  const rows = await db
    .select({ role: workspaceUser.role_id })
    .from(workspaceUser)
    .where(
      and(
        eq(workspaceUser.workspace_id, workspaceId),
        eq(workspaceUser.user_id, userId),
      ),
    );

  if (rows.length === 0) {
    // ensureLocalWorkspace() enrols the caller before we get here, so this is a
    // safety net for the bootstrap workspace only. Granting admin to anyone who
    // reaches it with an arbitrary workspace id would reopen the escalation
    // that ensureLocalWorkspace closes.
    if (!isBootstrapWorkspaceId(workspaceId)) {
      throw new Error("Forbidden");
    }

    await seedDefaultRoles(db, workspaceId);
    await db.insert(workspaceUser).values({
      workspace_id: workspaceId,
      user_id: userId,
      role_id: "admin",
      metadata: {},
    });
    return ["admin"];
  }

  return rows.map((row) => row.role);
}

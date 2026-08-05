import { resolveTenantContext } from "@/lib/server/tenant/context";
import { hasCapability } from "@/lib/server/tenant/permissions";

/**
 * Server-side gate for the Dev menu pages.
 *
 * Returns `null` when the caller may proceed, or the element to render instead.
 * Mirrors the check the existing `/build/roles` page does inline, but gates on
 * the `workspace.view` capability rather than a hardcoded role string so it
 * stays consistent with the API routes these pages call.
 *
 * The API routes enforce this independently — this only avoids rendering a page
 * whose every request would 403.
 */
export async function requireDevAccess(): Promise<React.ReactElement | null> {
  let tenant: Awaited<ReturnType<typeof resolveTenantContext>>;

  try {
    tenant = await resolveTenantContext();
  } catch {
    return (
      <div className="p-8 text-destructive">
        You need to sign in to view this page.
      </div>
    );
  }

  if (!hasCapability(tenant, "workspace.view")) {
    return (
      <div className="p-8 text-destructive">
        You do not have access to this page.
      </div>
    );
  }

  return null;
}

import { redirect } from "next/navigation";
import { RolesPermissionsView } from "@/components/build/roles-permissions-view";
import { resolveTenantContext } from "@/lib/server/tenant/context";

export default async function RolesPage() {
  // Server-side admin check
  try {
    const tenant = await resolveTenantContext();
    if (!tenant.roles.includes("admin")) {
      return (
        <div className="p-8 text-destructive">Error: Admin access required</div>
      );
    }
  } catch {
    // If tenant resolution fails (e.g. not logged in), let middleware or client handle it,
    // or redirect to login.
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl tracking-tight">
          Roles & Permissions
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage system roles, assign permissions, and detect RLS policy gaps.
        </p>
      </div>

      <RolesPermissionsView />
    </div>
  );
}

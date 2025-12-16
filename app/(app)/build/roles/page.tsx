import { resolveTenantContext } from "@/lib/server/tenant/context";
import { RolesPermissionsView } from "@/components/build/roles-permissions-view";
import { redirect } from "next/navigation";

export default async function RolesPage() {
  // Server-side admin check
  try {
    const tenant = await resolveTenantContext();
    if (!tenant.roles.includes("admin")) {
        return <div className="p-8 text-destructive">Error: Admin access required</div>;
    }
  } catch (e) {
      // If tenant resolution fails (e.g. not logged in), let middleware or client handle it, 
      // or redirect to login.
      redirect("/login");
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Manage system roles, assign permissions, and detect RLS policy gaps.
        </p>
      </div>
      
      <RolesPermissionsView />
    </div>
  );
}

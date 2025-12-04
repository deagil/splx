import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { TablesListView } from "@/components/data/tables-list-view";

/**
 * System page for managing tables
 * Uses custom component rather than page/block system since it displays
 * database metadata (from information_schema) rather than configured tables
 */
export default async function TablesPage() {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "pages.view");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tables</h1>
        <p className="text-muted-foreground mt-2">
          Manage your data tables, configure labels, descriptions, and field styling.
        </p>
      </div>
      <TablesListView />
    </div>
  );
}

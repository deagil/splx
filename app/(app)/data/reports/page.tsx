import { ReportsListView } from "@/components/reports/reports-list-view";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";

export default async function ReportsPage() {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "pages.view");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl">Reports</h1>
        <p className="mt-2 text-muted-foreground">
          Create, review, and explore saved SQL reports for charting and
          analysis.
        </p>
      </div>
      <ReportsListView />
    </div>
  );
}

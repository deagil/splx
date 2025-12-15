import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { ReportBuilder } from "@/components/reports/report-builder";

export default async function ReportBuilderPage() {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "tables.edit");

  return (
    <div className="h-screen overflow-hidden">
      <ReportBuilder />
    </div>
  );
}







import { TableDetailView } from "@/components/data/table-detail-view";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";

interface PageProps {
  params: Promise<{ table: string }>;
}

export default async function TableDetailPage({ params }: PageProps) {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "pages.view");

  const { table: tableName } = await params;

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <TableDetailView tableName={tableName} />
    </div>
  );
}

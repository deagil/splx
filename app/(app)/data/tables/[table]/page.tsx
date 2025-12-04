import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";
import { TableDetailView } from "@/components/data/table-detail-view";

type PageProps = {
  params: Promise<{ table: string }>;
};

export default async function TableDetailPage({ params }: PageProps) {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "pages.view");

  const { table: tableName } = await params;

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <TableDetailView tableName={tableName} />
    </div>
  );
}

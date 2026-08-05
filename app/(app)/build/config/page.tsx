import { Suspense } from "react";
import { ConfigTablesView } from "@/components/build/config-tables-view";
import { AppLoader } from "@/components/shared/app-loader";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";

async function ConfigPageContent() {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "pages.view");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl">Config Tables</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage workspace configuration tables (pages, workflows,
          roles, etc.).
        </p>
      </div>
      <ConfigTablesView />
    </div>
  );
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<AppLoader label="Loading config tables" />}>
      <ConfigPageContent />
    </Suspense>
  );
}

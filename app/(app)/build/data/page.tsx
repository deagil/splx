import { redirect } from "next/navigation";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";

export default async function DataPage() {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "pages.view");

  // Redirect to the new tables route
  redirect("/data/tables");
}



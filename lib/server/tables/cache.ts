import { revalidateTag, unstable_cache } from "next/cache";
import type { TenantContext } from "@/lib/server/tenant/context";
import { getTableConfig } from "./repository";

const TABLE_METADATA_CACHE_ENABLED =
  process.env.TABLE_METADATA_CACHE_ENABLED === "true";

const ONE_DAY_SECONDS = 60 * 60 * 24;

function getMetadataTag(workspaceId: string, tableId: string) {
  return `table-metadata:${workspaceId}:${tableId}`;
}

export function isTableMetadataCacheEnabled() {
  if (process.env.NODE_ENV === "development") {
    return false;
  }
  return TABLE_METADATA_CACHE_ENABLED;
}

export async function getTableConfigCached(
  tenant: TenantContext,
  tableId: string
) {
  if (!isTableMetadataCacheEnabled()) {
    return getTableConfig(tenant, tableId);
  }

  const tag = getMetadataTag(tenant.workspaceId, tableId);
  const cached = unstable_cache(
    async () => getTableConfig(tenant, tableId),
    ["table-metadata", tenant.workspaceId, tableId],
    {
      tags: [tag],
      revalidate: ONE_DAY_SECONDS,
    }
  );

  return cached();
}

export async function invalidateTableMetadataCache(
  tenant: TenantContext,
  tableId: string
) {
  if (!isTableMetadataCacheEnabled()) {
    return;
  }

  const tag = getMetadataTag(tenant.workspaceId, tableId);
  revalidateTag(tag);
}


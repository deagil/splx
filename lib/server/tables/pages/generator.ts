import { createPage } from "@/lib/server/pages";
import type { TenantContext } from "@/lib/server/tenant/context";
import type { TableRecord } from "../schema";
import {
  generateDetailPageBlock,
  generateListPageBlock,
  generatePageSettings,
} from "./templates";

/**
 * Auto-generates a list page for a table
 */
export async function generateListPage(
  tenant: TenantContext,
  tableConfig: TableRecord
): Promise<void> {
  const pageId = `${tableConfig.id}_list`;
  const listBlock = generateListPageBlock(tableConfig);
  const settings = generatePageSettings(tableConfig, false);

  await createPage(tenant, {
    blocks: [listBlock],
    description: `List view for ${tableConfig.name}`,
    id: pageId,
    layout: {},
    name: `${tableConfig.name} - List`,
    settings,
  });
}

/**
 * Auto-generates a detail page for a table
 */
export async function generateDetailPage(
  tenant: TenantContext,
  tableConfig: TableRecord
): Promise<void> {
  const pageId = `${tableConfig.id}_detail`;
  const detailBlock = generateDetailPageBlock(tableConfig);
  const settings = generatePageSettings(tableConfig, true);

  await createPage(tenant, {
    blocks: [detailBlock],
    description: `Detail view for ${tableConfig.name}`,
    id: pageId,
    layout: {},
    name: `${tableConfig.name} - Detail`,
    settings,
  });
}

/**
 * Auto-generates both list and detail pages for a table
 */
export async function generatePagesForTable(
  tenant: TenantContext,
  tableConfig: TableRecord
): Promise<{ listPageId: string; detailPageId: string }> {
  await generateListPage(tenant, tableConfig);
  await generateDetailPage(tenant, tableConfig);

  return {
    detailPageId: `${tableConfig.id}_detail`,
    listPageId: `${tableConfig.id}_list`,
  };
}

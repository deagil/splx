import type { PageBlock, PageSettings } from "@/lib/server/pages/schema";
import type { TableRecord } from "../schema";

/**
 * Generates a list page block for a table
 */
export function generateListPageBlock(tableConfig: TableRecord): PageBlock {
  return {
    dataSource: {
      endpoint: `/api/data/${tableConfig.id}`,
      tableName: tableConfig.id,
      type: "table",
    },
    displayConfig: {
      pageSize: 20,
      showFilters: true,
      showSearch: true,
      title: tableConfig.name,
    },
    id: `${tableConfig.id}_list`,
    position: {
      height: 8,
      width: 12,
      x: 0,
      y: 0,
    },
    type: "list",
  };
}

/**
 * Generates a detail page block for a table
 */
export function generateDetailPageBlock(tableConfig: TableRecord): PageBlock {
  return {
    dataSource: {
      endpoint: `/api/data/${tableConfig.id}`,
      recordIdParam: "id",
      tableName: tableConfig.id,
      type: "table",
    },
    displayConfig: {
      showDeleteButton: true,
      showEditButton: true,
      title: tableConfig.name,
    },
    id: `${tableConfig.id}_detail`,
    position: {
      height: 10,
      width: 12,
      x: 0,
      y: 0,
    },
    type: "record",
  };
}

/**
 * Generates default page settings
 */
export function generatePageSettings(
  tableConfig: TableRecord,
  isDetail = false
): PageSettings {
  return {
    hideHeader: false,
    urlParams: isDetail
      ? [
          {
            description: `Record ID for ${tableConfig.name}`,
            name: "id",
            required: true,
          },
        ]
      : [],
  };
}

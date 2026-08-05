import {
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * Feature set shared by the DataGrid wrappers and their consumers.
 *
 * TanStack Table v9 no longer bundles every feature automatically — each one is
 * registered explicitly and tree-shaken. This set covers exactly the APIs the
 * wrappers call:
 *
 * - `rowSortingFeature`      column.getIsSorted / toggleSorting / clearSorting / getCanSort
 * - `rowPaginationFeature`   pagination state driven by DataGridPagination
 * - `columnOrderingFeature`  table.setColumnOrder + state.columnOrder (move left/right)
 * - `columnPinningFeature`   column.pin / getIsPinned / getStart / getAfter
 * - `columnVisibilityFeature` column.getCanHide / getIsVisible / toggleVisibility
 * - `columnSizingFeature`    column.getSize
 * - `columnResizingFeature`  column.getCanResize + columnResizeMode
 * - `rowSelectionFeature`    row.getIsSelected / toggleSelected + the
 *                            select-all header checkbox in DataGridTable
 *
 * Prerequisite features are declared before the row-model slots that depend on
 * them, as v9 requires.
 *
 * The full `sortFns` registry is registered rather than individual
 * `sortFn_*` entries because columns are generated dynamically from table
 * metadata, so the auto-detected sort function is not known ahead of time.
 * That bundles every built-in sort fn; narrow it if bundle size matters and the
 * column types become statically known.
 */
export const dataGridFeatures = tableFeatures({
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

export type DataGridFeatures = typeof dataGridFeatures;

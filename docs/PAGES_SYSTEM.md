# Pages System

## Overview

The Pages System is a visual page builder that allows users to create custom interfaces by composing reusable blocks. Each page is a collection of blocks (List, Record, Report, Trigger) arranged in a layout with dynamic filtering, URL parameter binding, and responsive design. Pages integrate with the AI Chat system to provide contextual data mentions.

## Core Concepts

### Page

A **Page** is a custom interface composed of:
- **Blocks**: Reusable UI components (List, Record, Report, Trigger)
- **Settings**: URL parameters, permissions, metadata
- **Layout**: Block arrangement and sizing

### Block

A **Block** is a self-contained UI component that:
- Displays or manipulates data from tables
- Can be filtered dynamically with URL parameters
- Registers its data for AI chat mentions
- Has configurable display options

### URL Parameters

**URL Parameters** enable dynamic pages:
- Define expected parameters in page settings
- Reference in block filters as `url.paramName`
- Pass via query string: `/pages/contacts?id=123`
- Power master-detail patterns and drill-downs

## Block Types

### 1. List Block

**Purpose**: Display paginated table data with filtering, sorting, and searching.

**Features**:
- Table or grid layout
- Column selection and ordering
- Filter conditions (equals, contains, greater than, etc.)
- Search across columns
- Pagination
- Row actions (view, edit, delete)

**Configuration**:
```typescript
{
  type: "list",
  id: "list-1",
  label: "Users",
  tableName: "users",
  columns: ["firstname", "lastname", "email", "job_title"],
  filters: [
    {
      field: "status",
      operator: "equals",
      value: "active"
    },
    {
      field: "department",
      operator: "equals",
      value: "url.dept" // URL parameter binding
    }
  ],
  displaySettings: {
    layout: "table", // or "grid"
    pageSize: 50,
    showSearch: true
  }
}
```

**URL Parameter Example**:
```
/pages/users?dept=engineering
// Filters users WHERE department = 'engineering'
```

### 2. Record Block

**Purpose**: Display or edit a single record.

**Modes**:
- **Read**: Display record data
- **Edit**: Inline editing with save/cancel
- **Create**: Form to create new record

**Features**:
- Field-level display control
- Validation rules
- Related record display
- Audit history integration

**Configuration**:
```typescript
{
  type: "record",
  id: "record-1",
  label: "User Details",
  tableName: "users",
  mode: "read", // or "edit", "create"
  recordId: "url.id", // URL parameter binding
  fields: ["firstname", "lastname", "email", "job_title", "avatar_url"],
  displaySettings: {
    layout: "vertical", // or "horizontal", "grid"
    showAuditHistory: true
  }
}
```

**URL Parameter Example**:
```
/pages/user-details?id=abc-123
// Shows record WHERE id = 'abc-123'
```

### 3. Report Block

**Purpose**: Display charts and visualizations from SQL queries.

**Features** (Planned):
- Line, bar, pie, area charts
- SQL query editor
- Parameter injection
- Export to CSV/PDF
- Real-time updates

**Status**: Not yet implemented

### 4. Trigger Block

**Purpose**: Action buttons with confirmation dialogs.

**Features**:
- Execute API calls or workflows
- Confirmation modal
- Success/error feedback
- Conditional visibility
- Icon and color customization

**Configuration**:
```typescript
{
  type: "trigger",
  id: "trigger-1",
  label: "Delete User",
  action: {
    type: "api",
    method: "DELETE",
    endpoint: "/api/data/users",
    body: {
      id: "url.id"
    }
  },
  confirmation: {
    title: "Delete User?",
    message: "This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel"
  },
  displaySettings: {
    variant: "destructive",
    icon: "trash"
  }
}
```

## Page Structure

### Page Record

Stored in `pages` table:

```typescript
type PageRecord = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string;
  blocks: Block[];
  settings: PageSettings;
  layout: LayoutConfig;
  created_at: Date;
  updated_at: Date;
  created_by: string;
};
```

### Page Settings

```typescript
type PageSettings = {
  urlParams?: Array<{
    name: string;
    label: string;
    required: boolean;
    default?: string;
  }>;
  permissions?: {
    view: string[];
    edit: string[];
  };
  metadata?: {
    icon?: string;
    color?: string;
    category?: string;
  };
};
```

### Layout Config

```typescript
type LayoutConfig = {
  type: "grid" | "flex";
  columns?: number;
  gap?: number;
  blocks: Array<{
    id: string;
    span?: number;
    order?: number;
  }>;
};
```

## Page Lifecycle

### 1. Page Loading

```typescript
// Server Component: app/(app)/pages/[pageId]/page.tsx
export default async function WorkspacePage({ params, searchParams }) {
  const { pageId } = await params;
  const urlParams = extractUrlParams(await searchParams);
  const tenant = await resolveTenantContext();

  // Permission check
  if (!hasCapability(tenant, "pages.view")) {
    notFound();
  }

  // Fetch page
  const page = await getPageById(tenant, pageId);

  // Determine view mode (read or edit)
  const viewMode = resolveViewMode(searchParams.viewMode);
  const canEdit = hasCapability(tenant, "pages.edit");

  return (
    <PageScreen
      page={page}
      viewMode={canEdit ? viewMode : "read"}
      urlParams={urlParams}
      canEdit={canEdit}
    />
  );
}
```

### 2. Page Rendering

```typescript
// Client Component: components/pages/page-screen.tsx
export function PageScreen({ page, viewMode, urlParams, canEdit }) {
  if (viewMode === "edit") {
    return <PageBuilder page={page} urlParams={urlParams} onSave={handleSave} />;
  }

  return <PageViewer page={page} urlParams={urlParams} />;
}
```

### 3. Block Rendering

```typescript
// components/pages/page-viewer.tsx
export function PageViewer({ page, urlParams }) {
  return (
    <MentionContextProvider>
      <div className="page-layout">
        {page.blocks.map(block => (
          <ViewBlock
            key={block.id}
            block={block}
            urlParams={urlParams}
          />
        ))}
      </div>
    </MentionContextProvider>
  );
}
```

```typescript
// components/pages/view-block.tsx
export function ViewBlock({ block, urlParams }) {
  switch (block.type) {
    case "list":
      return <ListBlockView block={block} urlParams={urlParams} />;
    case "record":
      return <RecordBlockView block={block} urlParams={urlParams} />;
    case "report":
      return <ReportBlockView block={block} urlParams={urlParams} />;
    case "trigger":
      return <TriggerBlockView block={block} urlParams={urlParams} />;
    default:
      return null;
  }
}
```

## URL Parameter Resolution

### Parameter Definition

In page settings:
```typescript
{
  settings: {
    urlParams: [
      {
        name: "userId",
        label: "User ID",
        required: true
      },
      {
        name: "tab",
        label: "Active Tab",
        required: false,
        default: "profile"
      }
    ]
  }
}
```

### Parameter Usage in Blocks

In block configuration:
```typescript
{
  type: "record",
  tableName: "users",
  recordId: "url.userId", // References URL parameter
  filters: [
    {
      field: "tab",
      operator: "equals",
      value: "url.tab"
    }
  ]
}
```

### Resolution Process

1. **Extract**: Parse query string into key-value pairs
2. **Validate**: Check required parameters are present
3. **Inject**: Replace `url.paramName` with actual values
4. **Execute**: Apply resolved filters to data queries

```typescript
function resolveUrlParam(value: string, urlParams: Record<string, string>): string {
  if (typeof value === "string" && value.startsWith("url.")) {
    const paramName = value.substring(4);
    return urlParams[paramName] || value;
  }
  return value;
}
```

## Page Builder

### Builder Interface

**Features**:
- Drag-and-drop block placement
- Visual block configuration
- Real-time preview
- Template library
- Undo/redo support

**Components**:
- `PageBuilder` - Main builder container
- `BlockPalette` - Available block types
- `BlockConfigPanel` - Block configuration modal
- `LayoutGrid` - Drag-and-drop canvas
- `PropertyPanel` - Page-level settings

### Adding Blocks

1. User clicks "Add Block" button
2. Block palette opens with available types
3. User selects block type
4. Configuration modal opens
5. User configures block settings
6. Block added to page layout
7. Page automatically saves draft

### Editing Blocks

1. User clicks block edit button
2. Configuration modal opens
3. User modifies settings
4. Changes saved to page config
5. Block re-renders with new settings

### Deleting Blocks

1. User clicks block delete button
2. Confirmation dialog appears
3. User confirms deletion
4. Block removed from layout
5. Remaining blocks adjust position

## Data Fetching

### List Block Data

```typescript
// Fetch table data with filters
const response = await fetch("/api/supabase/table", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    table: block.tableName,
    filters: resolvedFilters,
    page: currentPage,
    limit: block.displaySettings.pageSize || 50,
    search: searchQuery
  })
});

const { data, total } = await response.json();
```

### Record Block Data

```typescript
// Fetch single record
const response = await fetch("/api/supabase/record", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    table: block.tableName,
    id: resolvedRecordId
  })
});

const { data: record } = await response.json();
```

### Caching Strategy

- **SWR**: Client-side data fetching with cache
- **Revalidation**: On focus, interval, or manual
- **Optimistic Updates**: Immediate UI feedback
- **Error Retry**: Exponential backoff

```typescript
const { data, error, isLoading, mutate } = useSWR(
  [`/api/supabase/table`, block.tableName, filters],
  ([url, table, filters]) =>
    fetch(url, {
      method: "POST",
      body: JSON.stringify({ table, filters })
    }).then(r => r.json()),
  {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000
  }
);
```

## Filtering System

### Filter Operators

```typescript
type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null";
```

### Filter Conditions

```typescript
type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[];
  conjunction?: "AND" | "OR";
};
```

### Filter Resolution

1. **Static Filters**: Defined in block configuration
2. **URL Parameter Filters**: Resolved from query string
3. **User Filters**: Added via UI filter controls
4. **Combined**: All filters merged with AND/OR logic

### Server-Side Filtering

```typescript
// API route: app/(app)/api/supabase/table/route.ts
export async function POST(request: Request) {
  const { table, filters, page, limit } = await request.json();

  let query = supabase.from(table).select("*", { count: "exact" });

  // Apply filters
  for (const filter of filters) {
    query = applyFilter(query, filter);
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  return Response.json({ data, total: count });
}

function applyFilter(query, filter) {
  const { field, operator, value } = filter;

  switch (operator) {
    case "equals":
      return query.eq(field, value);
    case "contains":
      return query.ilike(field, `%${value}%`);
    case "greater_than":
      return query.gt(field, value);
    // ... other operators
  }
}
```

## Mention Integration

### Block Data Registration

Each block registers its data with the Mention Context:

```typescript
// components/pages/blocks/list-block-view.tsx
export function ListBlockView({ block, urlParams }) {
  const { data, isLoading } = useSWR(/* ... */);
  const { registerBlockData, unregisterBlockData } = useMentionableData();

  useEffect(() => {
    if (data && !isLoading) {
      registerBlockData({
        blockId: block.id,
        blockType: "list",
        tableName: block.tableName,
        label: block.label || `List: ${block.tableName}`,
        description: `${data.length} records from ${block.tableName}`,
        data: data
      });
    }

    return () => unregisterBlockData(block.id);
  }, [data, isLoading, block.id]);

  // ... render block
}
```

### Page-Level Mentions

The Mention Context automatically creates:
- **@page** - All block data from current page
- **@[blockLabel]** - Individual block data

Users can select these mentions in the AI chat to reference page data.

## Page Templates

### Available Templates

1. **Detail Page** - Master record with related lists
2. **List Page** - Searchable/filterable table
3. **Dashboard** - Multiple report blocks
4. **Form Page** - Record create/edit form

### Template Structure

```typescript
type PageTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  blocks: Block[];
  layout: LayoutConfig;
  settings: PageSettings;
};

const detailTemplate: PageTemplate = {
  id: "detail",
  name: "Detail Page",
  description: "Master record with related information",
  icon: "file-text",
  blocks: [
    {
      type: "record",
      id: "main-record",
      label: "Details",
      mode: "read",
      recordId: "url.id"
    },
    {
      type: "list",
      id: "related-list",
      label: "Related Records",
      filters: [{ field: "parent_id", operator: "equals", value: "url.id" }]
    }
  ],
  layout: {
    type: "grid",
    columns: 2,
    blocks: [
      { id: "main-record", span: 1 },
      { id: "related-list", span: 1 }
    ]
  },
  settings: {
    urlParams: [{ name: "id", label: "Record ID", required: true }]
  }
};
```

### Using Templates

1. User clicks "Create Page"
2. Template selector appears
3. User chooses template
4. Page created with template structure
5. User customizes blocks and settings

## Permissions

### Permission Checks

```typescript
// Server-side permission check
const canView = hasCapability(tenant, "pages.view");
const canEdit = hasCapability(tenant, "pages.edit");

// Page-level permissions
const pagePermissions = page.settings.permissions || {};
const userCanViewPage = pagePermissions.view?.includes(tenant.role);
const userCanEditPage = pagePermissions.edit?.includes(tenant.role);
```

### Permission Levels

- **pages.view**: Can view all pages
- **pages.edit**: Can create and edit pages
- **pages.delete**: Can delete pages
- **pages.publish**: Can publish pages (make visible to others)

### Row-Level Security

Block data filtered by workspace:
```sql
-- All tables include workspace_id
SELECT * FROM users WHERE workspace_id = $1;

-- RLS policies ensure users only see their workspace data
CREATE POLICY workspace_isolation ON users
  FOR ALL
  USING (workspace_id = current_setting('app.workspace_id')::uuid);
```

## API Endpoints

### Page CRUD

```
GET    /api/pages              # List all pages
POST   /api/pages              # Create new page
GET    /api/pages/[id]         # Get page by ID
PUT    /api/pages/[id]/save    # Update page
DELETE /api/pages/[id]         # Delete page
```

### Data Fetching

```
POST   /api/supabase/table     # Fetch table data with filters
POST   /api/supabase/record    # Fetch single record
PUT    /api/data/[table]       # Update record
POST   /api/data/[table]       # Create record
DELETE /api/data/[table]       # Delete record
```

## Database Schema

### Pages Table

```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  layout JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(workspace_id, slug)
);

CREATE INDEX idx_pages_workspace ON pages(workspace_id);
CREATE INDEX idx_pages_slug ON pages(workspace_id, slug);
```

## Performance Optimization

### Strategies

1. **Server Components**: Page skeleton rendered on server
2. **Streaming**: Blocks load progressively
3. **Parallel Fetching**: Multiple blocks fetch data concurrently
4. **Client-Side Caching**: SWR caches data across blocks
5. **Lazy Loading**: Off-screen blocks render on scroll
6. **Virtualization**: Large lists use virtual scrolling

### Metrics

- **Time to First Block**: ~300ms
- **Full Page Load**: ~1-2s (depends on block count)
- **Block Data Fetch**: ~200-500ms per block
- **Page Save**: ~500ms

## Testing

### Unit Tests

- URL parameter resolution
- Filter condition evaluation
- Block configuration validation
- Permission checks

### Integration Tests

- Page CRUD operations
- Block data fetching with filters
- URL parameter binding
- Permission enforcement

### E2E Tests

- Create page from template
- Add and configure blocks
- Navigate with URL parameters
- Edit and save page
- Delete page

## Troubleshooting

### Common Issues

**Page not loading:**
- Check permissions (`pages.view` capability)
- Verify page exists in workspace
- Check browser console for errors

**Block not displaying data:**
- Verify table exists and has data
- Check filter conditions (syntax, values)
- Inspect network tab for API errors
- Verify URL parameters are passed correctly

**URL parameters not working:**
- Check parameter is defined in page settings
- Verify parameter name matches `url.paramName` reference
- Check query string contains parameter
- Review parameter resolution logic

**Slow page load:**
- Reduce number of blocks
- Optimize filters to return fewer rows
- Enable pagination on list blocks
- Check database indexes on filtered fields

## Future Enhancements

### Short-Term
- Report block implementation
- Block copy/paste
- Page versioning
- Improved drag-and-drop
- Mobile responsive layouts

### Long-Term
- Conditional block visibility
- Dynamic block composition
- Custom block plugins
- Formula fields
- Workflow triggers
- Real-time collaboration
- Page analytics

## Related Documentation

- [AI_CHAT_SYSTEM.md](./AI_CHAT_SYSTEM.md) - AI chat integration with pages
- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - Table structure and data access
- [AI_CHAT_MENTIONS.md](./AI_CHAT_MENTIONS.md) - Mention system details

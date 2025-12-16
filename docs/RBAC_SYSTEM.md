# Role-Based Access Control (RBAC) System

## Executive Summary

Splx Studio implements a **multi-tenant, resource-based permission system** with three layers of security:

| Layer | Implementation | Purpose |
|-------|----------------|---------|
| **Database (RLS)** | PostgreSQL Row Level Security policies | Enforces access at the data layer |
| **Application** | `resolveTenantContext()` + `requireCapability()` | API route protection |
| **Middleware** | `proxy.ts` session validation | Authentication gate |

**Key Design Principles:**
- Permissions are stored in the database (`role_permissions` table) and checked via SQL functions
- Claims are synced to `auth.users.raw_app_meta_data` and refreshed on every request via `db_pre_request()`
- All tables have RLS enabled with workspace-scoped access
- Four standard roles: Admin (100), Builder (80), User (50), Viewer (10)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Permission System](#permission-system)
4. [RLS Helper Functions](#rls-helper-functions)
5. [Authentication Flow](#authentication-flow)
6. [Invitation Flow](#invitation-flow)
7. [API Route Protection](#api-route-protection)
8. [RLS Policy Patterns](#rls-policy-patterns)
9. [Adding New Permissions](#adding-new-permissions)
10. [Debugging & Testing](#debugging--testing)
11. [Not Yet Implemented](#not-yet-implemented)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Request Flow                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Request                                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────┐                                                         │
│  │  proxy.ts   │  ◄─── Validates Supabase session                       │
│  │ (Middleware)│       Checks onboarding status                         │
│  └──────┬──────┘       Sets workspace context headers                   │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────┐                                                     │
│  │   API Route     │  ◄─── resolveTenantContext()                       │
│  │ or Server Comp  │       requireCapability('permission')              │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐     ┌──────────────────┐                           │
│  │  Supabase SDK   │────►│  db_pre_request()│ ◄─── Loads fresh claims   │
│  │  (PostgREST)    │     │  (runs first)    │      into request context │
│  └────────┬────────┘     └──────────────────┘                           │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐     ┌──────────────────┐                           │
│  │   RLS Policy    │────►│ user_has_access()│ ◄─── Checks permission    │
│  │   Evaluation    │     │ user_at_least()  │      against role_perms   │
│  └────────┬────────┘     └──────────────────┘                           │
│           │                                                              │
│           ▼                                                              │
│      Data Returned                                                       │
│      (filtered by RLS)                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Claims Synchronization

```
┌───────────────────────────────────────────────────────────────────────┐
│                     Claims Sync Flow                                   │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  workspace_users table                                                 │
│         │                                                              │
│         │ INSERT/UPDATE/DELETE                                         │
│         ▼                                                              │
│  ┌──────────────────────┐                                              │
│  │ update_workspace_    │                                              │
│  │ roles() TRIGGER      │                                              │
│  └──────────┬───────────┘                                              │
│             │                                                          │
│             ▼                                                          │
│  ┌──────────────────────┐                                              │
│  │ auth.users           │                                              │
│  │ raw_app_meta_data    │                                              │
│  │ {                    │                                              │
│  │   "workspaces": {    │                                              │
│  │     "ws-uuid": [     │  ◄─── Roles stored as array per workspace   │
│  │       "admin",       │                                              │
│  │       "builder"      │                                              │
│  │     ]                │                                              │
│  │   }                  │                                              │
│  │ }                    │                                              │
│  └──────────────────────┘                                              │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core RBAC Tables

```sql
-- Workspace definitions
workspaces (
  id uuid PRIMARY KEY,
  name text,
  slug text UNIQUE,
  owner_user_id uuid REFERENCES auth.users,
  mode text CHECK (mode IN ('local', 'hosted')),
  ...
)

-- Role definitions (workspace-scoped)
roles (
  workspace_id uuid REFERENCES workspaces,
  id text,                    -- 'admin', 'builder', 'user', 'viewer'
  label text,                 -- 'Admin', 'Builder', 'User', 'Viewer'
  description text,
  level integer,              -- 100, 80, 50, 10
  PRIMARY KEY (workspace_id, id)
)

-- User-workspace membership
workspace_users (
  id uuid PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces,
  user_id uuid REFERENCES auth.users,
  role_id text,               -- References roles(id)
  team_id uuid REFERENCES teams,
  UNIQUE (workspace_id, user_id, role_id),
  FOREIGN KEY (workspace_id, role_id) REFERENCES roles(workspace_id, id)
)

-- Workspace invitations
workspace_invites (
  id uuid PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces,
  roles text[],               -- Array of role_ids to grant on accept
  email text,
  user_id uuid,               -- Set when accepted
  invited_by uuid REFERENCES auth.users,
  accepted_at timestamptz     -- Set when accepted
)

-- Permission definitions (global, not workspace-scoped)
role_permissions (
  role_id text,               -- 'admin', 'builder', 'user', 'viewer'
  permission text,            -- 'resource.action' format
  description text,
  PRIMARY KEY (role_id, permission)
)
```

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **admin** | 100 | Full access to all workspace features |
| **builder** | 80 | Create/edit pages, tables, and data; limited workspace settings |
| **user** | 50 | Use configured pages; create/edit/delete data |
| **viewer** | 10 | Read-only access to pages and data |

---

## Permission System

### Permission Naming Convention

Permissions follow `resource.action` dot notation:

```
resource.action
   │       │
   │       └── view, edit, create, delete, *
   │
   └── pages, tables, data, reports, workspace, chat, etc.
```

**Wildcards:**
- `*` - All permissions (admin only)
- `resource.*` - All actions on a resource (e.g., `pages.*`)

### Current Permission Matrix

| Permission | admin | builder | user | viewer |
|------------|:-----:|:-------:|:----:|:------:|
| `*` (wildcard) | ✓ | | | |
| `pages.view` | ✓ | ✓ | ✓ | ✓ |
| `pages.edit` | ✓ | ✓ | | |
| `tables.view` | ✓ | ✓ | ✓ | ✓ |
| `tables.edit` | ✓ | ✓ | | |
| `data.view` | ✓ | ✓ | ✓ | ✓ |
| `data.create` | ✓ | ✓ | ✓ | |
| `data.edit` | ✓ | ✓ | ✓ | |
| `data.delete` | ✓ | ✓ | ✓ | |
| `reports.view` | ✓ | ✓ | ✓ | ✓ |
| `reports.edit` | ✓ | ✓ | | |
| `workspace.view` | ✓ | ✓ | | |
| `workspace.edit` | ✓ | | | |
| `workspace.users` | ✓ | | | |
| `workspace.invites` | ✓ | | | |
| `chat.view` | ✓ | ✓ | ✓ | ✓ |
| `chat.create` | ✓ | ✓ | ✓ | |

### Querying Permissions

```sql
-- Get all permissions for a role
SELECT permission, description
FROM role_permissions
WHERE role_id = 'builder';

-- Get effective permissions for current user in a workspace
SELECT DISTINCT rp.permission
FROM role_permissions rp
WHERE rp.role_id IN (
  SELECT jsonb_array_elements_text(
    get_user_workspace_claims() -> 'your-workspace-id'
  )
);
```

---

## RLS Helper Functions

### Function Reference

| Function | Signature | Purpose |
|----------|-----------|---------|
| `db_pre_request()` | `() → void` | Loads claims into request context (runs before every query) |
| `get_user_workspace_claims()` | `() → jsonb` | Returns user's workspace roles from request context or JWT |
| `jwt_is_expired()` | `() → boolean` | Checks if JWT has expired |
| `user_is_workspace_member(uuid)` | `(workspace_id) → boolean` | Checks workspace membership |
| `user_has_workspace_role(uuid, text)` | `(workspace_id, role_id) → boolean` | Checks for specific role |
| `user_has_access(uuid, text)` | `(workspace_id, permission) → boolean` | **Main permission check** with wildcard support |
| `user_at_least(uuid, integer)` | `(workspace_id, level) → boolean` | Checks role hierarchy by level |
| `user_at_least_role(uuid, text)` | `(workspace_id, role_id) → boolean` | Checks role hierarchy by name |
| `user_owns_resource(uuid)` | `(owner_id) → boolean` | Checks if user owns a resource |

### Function Interaction Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    Permission Check Flow                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  user_has_access(workspace_id, 'pages.edit')                       │
│         │                                                           │
│         ├──► auth.role() = 'authenticated'?                        │
│         │         │                                                 │
│         │         ▼                                                 │
│         ├──► jwt_is_expired()?                                     │
│         │         │                                                 │
│         │         ▼                                                 │
│         ├──► get_user_workspace_claims()                           │
│         │         │                                                 │
│         │         ├──► current_setting('request.workspaces')       │
│         │         │    (set by db_pre_request)                     │
│         │         │                                                 │
│         │         └──► FALLBACK: auth.jwt() -> 'app_metadata'      │
│         │                        -> 'workspaces'                   │
│         │                                                           │
│         ▼                                                           │
│  claims -> workspace_id -> ['admin', 'builder']                    │
│         │                                                           │
│         ▼                                                           │
│  FOR EACH role IN user_roles:                                      │
│    ├──► Check role_permissions for '*' (wildcard)                  │
│    ├──► Check role_permissions for 'pages.*' (resource wildcard)   │
│    └──► Check role_permissions for 'pages.edit' (exact match)      │
│         │                                                           │
│         ▼                                                           │
│     RETURN TRUE/FALSE                                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### db_pre_request() Flow

```sql
-- Configured via: ALTER ROLE authenticator SET pgrst.db_pre_request = 'db_pre_request'
-- Runs BEFORE every PostgREST/Supabase SDK query

CREATE FUNCTION db_pre_request() RETURNS void AS $$
BEGIN
  -- 1. Fetch current roles from auth.users (not JWT)
  SELECT raw_app_meta_data -> 'workspaces' INTO workspace_roles
  FROM auth.users WHERE id = auth.uid();

  -- 2. Store in request context for RLS policies to use
  PERFORM set_config('request.workspaces', workspace_roles::text, FALSE);
END;
$$;
```

**Why this matters:** Role changes take effect immediately without requiring logout/login.

---

## Authentication Flow

### Sign In → OTP → Onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User enters email at /signin                                │
│         │                                                        │
│         ▼                                                        │
│     signInWithOtp({ email, shouldCreateUser: true })            │
│         │                                                        │
│         ▼                                                        │
│  2. User enters OTP at /otp                                     │
│         │                                                        │
│         ▼                                                        │
│     verifyOtp({ email, token, type: 'email' })                  │
│         │                                                        │
│         ├──► New user? Create `users` record                    │
│         │                                                        │
│         ├──► LOCAL mode: Add to default workspace as 'user'     │
│         │                                                        │
│         └──► HOSTED mode: Create personal workspace as 'admin'  │
│                   │                                              │
│                   ▼                                              │
│  3. Redirect to /onboarding (if not completed)                  │
│         │                                                        │
│         ▼                                                        │
│     Collect profile info, workspace details                     │
│         │                                                        │
│         ▼                                                        │
│     Set onboarding_completed = true                             │
│         │                                                        │
│         ▼                                                        │
│  4. Redirect to /app (dashboard)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Middleware (proxy.ts)

```typescript
// Runs on every request to /app/* routes
export async function middleware(request: NextRequest) {
  // 1. Get Supabase user
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Allow auth routes without authentication
  if (isAuthRoute(pathname)) return next();

  // 3. Redirect unauthenticated users to signin
  if (!user) return redirect('/signin');

  // 4. Check onboarding status
  const userRecord = await db.select().from(users).where(eq(id, user.id));
  if (!userRecord.onboarding_completed) return redirect('/onboarding');

  // 5. Set workspace context headers for downstream
  headers.set('x-workspace-id', workspaceId);

  return next();
}
```

---

## Invitation Flow

### Creating an Invite

```typescript
// POST /api/workspace/invites
{
  email: "newuser@example.com",
  roleId: "builder"
}

// Creates workspace_invites record:
{
  id: "invite-uuid",
  workspace_id: "ws-uuid",
  roles: ["builder"],
  email: "newuser@example.com",
  invited_by: "inviter-uuid",
  user_id: null,
  accepted_at: null
}
```

### Accepting an Invite

```
┌─────────────────────────────────────────────────────────────────┐
│                    Invite Acceptance Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User receives invite link with code                         │
│         │                                                        │
│         ▼                                                        │
│  POST /api/workspace/invites/accept?code={invite-uuid}          │
│         │                                                        │
│         ├──► Validate user is authenticated                     │
│         ├──► Fetch invite, check not already accepted           │
│         ├──► Optionally verify email matches                    │
│         └──► Check user not already a member                    │
│                   │                                              │
│                   ▼                                              │
│  2. Update invite record:                                       │
│     UPDATE workspace_invites                                    │
│     SET user_id = auth.uid(),                                   │
│         accepted_at = now()                                     │
│     WHERE id = invite_code                                      │
│         │                                                        │
│         │  TRIGGER: on_invite_accepted                          │
│         ▼                                                        │
│  3. accept_workspace_invite() fires:                            │
│     FOR EACH role IN invite.roles:                              │
│       INSERT INTO workspace_users                               │
│         (workspace_id, user_id, role_id)                        │
│       VALUES (invite.workspace_id, user.id, role)               │
│         │                                                        │
│         │  TRIGGER: on_workspace_user_change                    │
│         ▼                                                        │
│  4. update_workspace_roles() fires:                             │
│     UPDATE auth.users                                           │
│     SET raw_app_meta_data.workspaces.{ws_id} = [...roles]       │
│         │                                                        │
│         ▼                                                        │
│  5. User now has access to workspace                            │
│     (claims updated immediately via db_pre_request)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Route Protection

### Pattern 1: TenantContext + Capability Check (Recommended)

```typescript
// app/(app)/api/pages/route.ts
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { requireCapability } from "@/lib/server/tenant/permissions";

export async function GET() {
  // 1. Resolve tenant context (auth + workspace + roles)
  const tenant = await resolveTenantContext();

  // 2. Check capability (throws "Forbidden" if denied)
  requireCapability(tenant, "pages.view");

  // 3. Fetch data (RLS also enforces access)
  const store = await getResourceStore(tenant);
  const pages = await store.withSqlClient(async (db) => {
    return db.select().from(pagesTable);
  });

  return NextResponse.json({ pages });
}
```

### Pattern 2: Direct Supabase Auth (Legacy)

```typescript
// Some older routes use this pattern
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS handles permission checking
  const { data } = await supabase.from("pages").select("*");
  return NextResponse.json(data);
}
```

### TenantContext Structure

```typescript
type TenantContext = {
  mode: 'local' | 'hosted';   // App mode
  workspaceId: string;         // Current workspace UUID
  userId: string;              // Current user UUID
  roles: string[];             // User's roles in this workspace
  connectionId?: string;       // Resource store connection (hosted mode)
};
```

### TypeScript Permission Checking

```typescript
// lib/server/tenant/permissions.ts

const ROLE_CAPABILITIES: Record<string, readonly string[]> = {
  admin: ["*", "pages.view", "pages.edit", ...],
  builder: ["pages.view", "pages.edit", ...],
  user: ["pages.view", "data.view", "data.create", ...],
  viewer: ["pages.view", "tables.view", "data.view"],
};

export function hasCapability(tenant: TenantContext, capability: string): boolean {
  return tenant.roles.some((role) => {
    const capabilities = ROLE_CAPABILITIES[role] ?? [];
    return capabilities.includes("*") || capabilities.includes(capability);
  });
}

export function requireCapability(tenant: TenantContext, capability: string): void {
  if (!hasCapability(tenant, capability)) {
    throw new Error("Forbidden");
  }
}
```

---

## RLS Policy Patterns

### Pattern 1: Permission-Based Access

```sql
-- Users with 'pages.view' permission can SELECT
CREATE POLICY pages_select ON pages
FOR SELECT TO authenticated
USING (user_has_access(workspace_id, 'pages.view'));

-- Users with 'pages.edit' permission can INSERT/UPDATE/DELETE
CREATE POLICY pages_insert ON pages
FOR INSERT TO authenticated
WITH CHECK (user_has_access(workspace_id, 'pages.edit'));
```

### Pattern 2: Role Hierarchy

```sql
-- Builder level (80) and above can modify
CREATE POLICY tables_modify ON tables
FOR ALL TO authenticated
USING (user_at_least(workspace_id, 80));

-- Or by role name
CREATE POLICY tables_modify ON tables
FOR ALL TO authenticated
USING (user_at_least_role(workspace_id, 'builder'));
```

### Pattern 3: Membership Only

```sql
-- Any workspace member can view
CREATE POLICY chats_select ON chats
FOR SELECT TO authenticated
USING (user_is_workspace_member(workspace_id));
```

### Pattern 4: Owner Override

```sql
-- Owners can always access, others need permission
CREATE POLICY chats_update ON chats
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()  -- Owner
  OR user_has_workspace_role(workspace_id, 'admin')  -- Admin
);
```

### Pattern 5: Self-Only Access

```sql
-- Users can only access their own records
CREATE POLICY users_update ON users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

### Current Table Policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `workspaces` | Member OR Admin | Authenticated | Admin | - |
| `workspace_users` | Member | Admin | Admin | Admin |
| `workspace_invites` | Member | Admin | Admin | Admin |
| `workspace_apps` | Member | Admin | Admin | Admin |
| `roles` | Member | Admin | Admin | Admin |
| `teams` | Member | Admin | Admin | Admin |
| `users` | Self OR Workspace colleagues | Self | Self | - |
| `pages` | `pages.view` | `pages.edit` | `pages.edit` | `pages.edit` |
| `tables` | `tables.view` | `tables.edit` | `tables.edit` | `tables.edit` |
| `reports` | `reports.view` | `reports.edit` | `reports.edit` | `reports.edit` |
| `chats` | Member | Member (own) | Owner OR Admin | Owner OR Admin |
| `messages` | Member | Member | Admin | Admin |
| `documents` | Member | Member | Member | Admin |
| `ai_skills` | Self | Self | Self | Self |
| `role_permissions` | All | - | - | - |

---

## Adding New Permissions

### Step 1: Add to Database

```sql
-- Add a new permission to a role
INSERT INTO role_permissions (role_id, permission, description)
VALUES ('builder', 'workflows.edit', 'Create and edit workflows');

-- Add to multiple roles
INSERT INTO role_permissions (role_id, permission, description) VALUES
  ('admin', 'workflows.*', 'Full workflow management'),
  ('builder', 'workflows.view', 'View workflows'),
  ('builder', 'workflows.edit', 'Edit workflows'),
  ('user', 'workflows.view', 'View workflows');
```

### Step 2: Update TypeScript (Optional - for defense in depth)

```typescript
// lib/server/tenant/permissions.ts
const ROLE_CAPABILITIES: Record<string, readonly string[]> = {
  admin: ["*", ...],
  builder: [..., "workflows.view", "workflows.edit"],
  user: [..., "workflows.view"],
  viewer: [...],
};
```

### Step 3: Create RLS Policies

```sql
-- Enable RLS on new table
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY workflows_select ON workflows
FOR SELECT TO authenticated
USING (user_has_access(workspace_id, 'workflows.view'));

CREATE POLICY workflows_insert ON workflows
FOR INSERT TO authenticated
WITH CHECK (user_has_access(workspace_id, 'workflows.edit'));

CREATE POLICY workflows_update ON workflows
FOR UPDATE TO authenticated
USING (user_has_access(workspace_id, 'workflows.edit'))
WITH CHECK (user_has_access(workspace_id, 'workflows.edit'));

CREATE POLICY workflows_delete ON workflows
FOR DELETE TO authenticated
USING (user_has_access(workspace_id, 'workflows.edit'));
```

### Step 4: Protect API Route

```typescript
export async function POST(request: Request) {
  const tenant = await resolveTenantContext();
  requireCapability(tenant, "workflows.edit");
  // ... create workflow
}
```

---

## Debugging & Testing

### Check User's Current Roles

```sql
-- Via claims (what RLS sees)
SELECT get_user_workspace_claims();

-- Via workspace_users table
SELECT wu.role_id, r.label, r.level
FROM workspace_users wu
JOIN roles r ON wu.workspace_id = r.workspace_id AND wu.role_id = r.id
WHERE wu.user_id = auth.uid();
```

### Check User's Effective Permissions

```sql
-- All permissions for current user in a workspace
SELECT DISTINCT rp.permission, rp.description
FROM role_permissions rp
WHERE rp.role_id IN (
  SELECT jsonb_array_elements_text(
    get_user_workspace_claims() -> 'your-workspace-uuid'
  )
)
ORDER BY rp.permission;
```

### Test Permission Functions

```sql
-- Test specific permission
SELECT user_has_access('workspace-uuid', 'pages.edit');

-- Test role hierarchy
SELECT user_at_least('workspace-uuid', 50);  -- User level
SELECT user_at_least_role('workspace-uuid', 'builder');

-- Test membership
SELECT user_is_workspace_member('workspace-uuid');
```

### Test RLS Policies

```sql
-- Impersonate a user (admin only)
SET request.jwt.claims.sub = 'user-uuid';
SET role authenticated;

-- Try query - should be filtered by RLS
SELECT * FROM pages WHERE workspace_id = 'workspace-uuid';

-- Reset
RESET role;
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Permission denied" but user has role | Claims not synced | Check `update_workspace_roles` trigger is firing |
| RLS returns no rows | `db_pre_request` not configured | Verify `ALTER ROLE authenticator SET pgrst.db_pre_request` |
| JWT expired errors | Token not refreshed | Client should call `supabase.auth.refreshSession()` |
| New role not taking effect | Claims cached in JWT | `db_pre_request` should fix this; verify it's configured |

---

## Not Yet Implemented

The following features from the reference implementations are **not yet implemented** in Splx:

### From Single-Tenant Guide

| Feature | Status | Notes |
|---------|--------|-------|
| `user_in_team(team_id)` function | Not implemented | Teams table exists but no RLS helper |
| Team-based resource access policies | Not implemented | e.g., `USING (user_in_team(team_id) AND user_has_access(...))` |
| Client-side permission hooks | Not implemented | No `usePermissions()` React hook |
| Permission-based navigation filtering | Not implemented | Nav doesn't hide items based on permissions |
| `hasAnyPermission()` / `hasAllPermissions()` | Not implemented | Only single permission check available |
| Profile edit own (`profile.edit_own`) | Not implemented | No self-scoped profile editing permission |
| Resource-specific wildcards in DB | Partial | `*` works, `resource.*` requires explicit entries |

### From pointsource/supabase_rbac

| Feature | Status | Notes |
|---------|--------|-------|
| Edge Function for invite acceptance | Uses API route instead | `/api/workspace/invites/accept` |
| `add_user_by_email()` helper | Not implemented | Admin must use API to add users |
| Multiple roles per user per workspace | Supported | Schema allows, UI may not expose |
| Role views with `security_invoker` | Not implemented | Direct table queries used |
| Automatic owner role on group creation | Partial | Done in application code, not trigger |
| Self-service user operations | Not implemented | All user management is admin-only |

### Recommended Future Enhancements

1. **Team-Based Access**
   ```sql
   CREATE FUNCTION user_in_team(p_team_id uuid) RETURNS boolean AS $$
     SELECT EXISTS (
       SELECT 1 FROM team_members
       WHERE team_id = p_team_id AND user_id = auth.uid()
     );
   $$ LANGUAGE sql STABLE;
   ```

2. **Client-Side Permission Context**
   ```typescript
   // React context for permissions
   const { hasPermission, isLoading } = usePermissions();
   if (hasPermission('pages.edit')) { /* show edit button */ }
   ```

3. **Navigation Filtering**
   ```typescript
   // Filter nav items by permission
   const visibleItems = navItems.filter(item =>
     hasPermission(item.requiredPermission)
   );
   ```

4. **Composite Permission Checks**
   ```sql
   CREATE FUNCTION user_has_any_access(p_workspace_id uuid, p_permissions text[])
   RETURNS boolean AS $$
     SELECT EXISTS (
       SELECT 1 FROM unnest(p_permissions) AS p(perm)
       WHERE user_has_access(p_workspace_id, p.perm)
     );
   $$ LANGUAGE sql STABLE;
   ```

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20251111000100_workspace_rbac.sql` | Core RBAC schema, triggers, functions |
| `supabase/migrations/20251111000300_workspace_rls.sql` | Initial RLS policies |
| `supabase/migrations/20251215200000_resource_permissions.sql` | Permission system, updated policies |
| `lib/server/tenant/context.ts` | TenantContext resolution |
| `lib/server/tenant/permissions.ts` | TypeScript capability checking |
| `lib/server/tenant/default-roles.ts` | Default role definitions |
| `lib/supabase/server.ts` | Server-side Supabase client |
| `proxy.ts` | Authentication middleware |
| `app/api/workspace/invites/route.ts` | Invite CRUD |
| `app/api/workspace/invites/accept/route.ts` | Invite acceptance |

---

## Quick Reference

### Permission Check Cheatsheet

```sql
-- In RLS policies
USING (user_has_access(workspace_id, 'resource.action'))
USING (user_at_least(workspace_id, 50))
USING (user_is_workspace_member(workspace_id))
USING (user_owns_resource(owner_id))
USING (user_has_workspace_role(workspace_id, 'admin'))
```

```typescript
// In API routes
const tenant = await resolveTenantContext();
requireCapability(tenant, "resource.action");
if (hasCapability(tenant, "resource.action")) { ... }
```

### Role Levels

```
admin   = 100
builder = 80
user    = 50
viewer  = 10
```

-- Resource-Based Permissions Migration
-- Implements permission checking at the database layer following supabase_rbac best practices
-- Adapted for multi-tenant workspace architecture

-- =============================================================================
-- PART 0: ENSURE WORKSPACE_USERS CONSTRAINT EXISTS
-- =============================================================================
-- The original constraint was on (workspace_id, user_id, role) but column was renamed to role_id
-- Add explicit unique constraint if it doesn't exist

DO $$
BEGIN
  -- Drop old constraint if it exists with wrong column name
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspace_users_workspace_id_user_id_role_key'
  ) THEN
    ALTER TABLE public.workspace_users
    DROP CONSTRAINT workspace_users_workspace_id_user_id_role_key;
  END IF;

  -- Create proper unique constraint on (workspace_id, user_id, role_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspace_users_workspace_id_user_id_role_id_key'
  ) THEN
    ALTER TABLE public.workspace_users
    ADD CONSTRAINT workspace_users_workspace_id_user_id_role_id_key
    UNIQUE (workspace_id, user_id, role_id);
  END IF;
END $$;

-- =============================================================================
-- PART 1: ROLE PERMISSIONS TABLE
-- =============================================================================
-- Global role permissions (not workspace-scoped since role definitions are standardized)

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id text NOT NULL,
  permission text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON public.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON public.role_permissions (permission);

COMMENT ON TABLE public.role_permissions IS 'Maps roles to permissions using resource.action notation';
COMMENT ON COLUMN public.role_permissions.permission IS 'Permission in resource.action format (e.g., pages.edit, data.*, *)';

-- =============================================================================
-- PART 2: SEED DEFAULT PERMISSIONS
-- =============================================================================
-- Mirrors lib/server/tenant/permissions.ts ROLE_CAPABILITIES

INSERT INTO public.role_permissions (role_id, permission, description) VALUES
  -- Admin: Full access (wildcard)
  ('admin', '*', 'Full system access'),

  -- Builder: Can create/edit pages, tables, and data
  ('builder', 'pages.view', 'View pages'),
  ('builder', 'pages.edit', 'Create and edit pages'),
  ('builder', 'tables.view', 'View table definitions'),
  ('builder', 'tables.edit', 'Create and edit tables'),
  ('builder', 'data.view', 'View table data'),
  ('builder', 'data.create', 'Create records'),
  ('builder', 'data.edit', 'Edit records'),
  ('builder', 'data.delete', 'Delete records'),
  ('builder', 'reports.view', 'View reports'),
  ('builder', 'reports.edit', 'Create and edit reports'),

  -- User: Can use pages and CRUD data, but not edit structure
  ('user', 'pages.view', 'View pages'),
  ('user', 'tables.view', 'View table definitions'),
  ('user', 'data.view', 'View table data'),
  ('user', 'data.create', 'Create records'),
  ('user', 'data.edit', 'Edit records'),
  ('user', 'data.delete', 'Delete records'),
  ('user', 'reports.view', 'View reports'),

  -- Viewer: Read-only access
  ('viewer', 'pages.view', 'View pages'),
  ('viewer', 'tables.view', 'View table definitions'),
  ('viewer', 'data.view', 'View table data'),
  ('viewer', 'reports.view', 'View reports')
ON CONFLICT (role_id, permission) DO NOTHING;

-- =============================================================================
-- PART 3: PERMISSION HELPER FUNCTIONS
-- =============================================================================

-- Function: user_has_access(workspace_id, permission)
-- Checks if user has a specific permission in a workspace (supports wildcards)
CREATE OR REPLACE FUNCTION public.user_has_access(p_workspace_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_roles jsonb;
  role_id text;
BEGIN
  -- Check authentication
  IF auth.role() != 'authenticated' THEN
    RETURN FALSE;
  END IF;

  -- Check JWT expiration
  IF public.jwt_is_expired() THEN
    RETURN FALSE;
  END IF;

  -- Allow postgres superuser (for migrations/admin)
  IF SESSION_USER = 'postgres' THEN
    RETURN TRUE;
  END IF;

  -- Get user's roles for this workspace from claims
  user_roles := public.get_user_workspace_claims() -> p_workspace_id::text;

  IF user_roles IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check each role for the permission
  FOR role_id IN SELECT jsonb_array_elements_text(user_roles)
  LOOP
    -- Check for wildcard permission (admin)
    IF EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = user_has_access.role_id
      AND rp.permission = '*'
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check for resource wildcard (e.g., pages.*)
    IF EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = user_has_access.role_id
      AND rp.permission = split_part(p_permission, '.', 1) || '.*'
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check for exact permission
    IF EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = user_has_access.role_id
      AND rp.permission = p_permission
    ) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.user_has_access(uuid, text) IS 'Check if user has permission in workspace (supports wildcards)';

-- Function: user_at_least(workspace_id, level)
-- Checks if user has at least the specified role level in a workspace
CREATE OR REPLACE FUNCTION public.user_at_least(p_workspace_id uuid, p_level integer)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_roles jsonb;
  role_id text;
  max_level integer := 0;
BEGIN
  -- Check authentication
  IF auth.role() != 'authenticated' THEN
    RETURN FALSE;
  END IF;

  -- Check JWT expiration
  IF public.jwt_is_expired() THEN
    RETURN FALSE;
  END IF;

  -- Allow postgres superuser
  IF SESSION_USER = 'postgres' THEN
    RETURN TRUE;
  END IF;

  -- Get user's roles for this workspace from claims
  user_roles := public.get_user_workspace_claims() -> p_workspace_id::text;

  IF user_roles IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Find the highest level among user's roles
  SELECT COALESCE(MAX(r.level), 0) INTO max_level
  FROM public.roles r
  WHERE r.workspace_id = p_workspace_id
  AND r.id IN (SELECT jsonb_array_elements_text(user_roles));

  RETURN max_level >= p_level;
END;
$$;

COMMENT ON FUNCTION public.user_at_least(uuid, integer) IS 'Check if user has at least the specified role level (admin=100, builder=80, user=50, viewer=10)';

-- Function: user_at_least_role(workspace_id, role_id)
-- Convenience function to check by role name instead of level
CREATE OR REPLACE FUNCTION public.user_at_least_role(p_workspace_id uuid, p_role_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  required_level integer;
BEGIN
  -- Get the level for the required role
  SELECT r.level INTO required_level
  FROM public.roles r
  WHERE r.workspace_id = p_workspace_id
  AND r.id = p_role_id;

  IF required_level IS NULL THEN
    -- Fallback to standard levels if role not found in workspace
    required_level := CASE p_role_id
      WHEN 'admin' THEN 100
      WHEN 'builder' THEN 80
      WHEN 'user' THEN 50
      WHEN 'viewer' THEN 10
      ELSE 0
    END;
  END IF;

  RETURN public.user_at_least(p_workspace_id, required_level);
END;
$$;

COMMENT ON FUNCTION public.user_at_least_role(uuid, text) IS 'Check if user has at least the specified role level by role name';

-- Function: user_owns_resource(owner_id)
-- Check if user owns a resource
CREATE OR REPLACE FUNCTION public.user_owns_resource(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT auth.uid() = p_owner_id;
$$;

COMMENT ON FUNCTION public.user_owns_resource(uuid) IS 'Check if current user owns the resource';

-- =============================================================================
-- PART 4: INVITE ACCEPTANCE TRIGGER
-- =============================================================================

-- Function to auto-create workspace membership when invite is accepted
CREATE OR REPLACE FUNCTION public.accept_workspace_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_to_add text;
BEGIN
  -- Only fire when accepted_at is being set and user_id is provided
  IF NEW.accepted_at IS NOT NULL
     AND OLD.accepted_at IS NULL
     AND NEW.user_id IS NOT NULL THEN

    -- Insert membership for each role in the invite
    FOREACH role_to_add IN ARRAY NEW.roles
    LOOP
      INSERT INTO public.workspace_users (workspace_id, user_id, role_id)
      VALUES (NEW.workspace_id, NEW.user_id, role_to_add)
      ON CONFLICT (workspace_id, user_id, role_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for invite acceptance
DROP TRIGGER IF EXISTS on_invite_accepted ON public.workspace_invites;
CREATE TRIGGER on_invite_accepted
  AFTER UPDATE ON public.workspace_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.accept_workspace_invite();

COMMENT ON FUNCTION public.accept_workspace_invite() IS 'Auto-creates workspace membership when invite is accepted';

-- =============================================================================
-- PART 5: RLS FOR PREVIOUSLY UNPROTECTED TABLES
-- =============================================================================

-- 5a. Users table RLS
-- Users can see other users in their workspaces (for mentions, collaboration)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
FOR SELECT TO authenticated
USING (
  -- Can always see own profile
  id = auth.uid()
  OR
  -- Can see users in same workspace
  EXISTS (
    SELECT 1 FROM public.workspace_users wu1
    JOIN public.workspace_users wu2 ON wu1.workspace_id = wu2.workspace_id
    WHERE wu1.user_id = auth.uid()
    AND wu2.user_id = users.id
  )
);

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- 5b. Tables (table configs) RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tables_select ON public.tables;
CREATE POLICY tables_select ON public.tables
FOR SELECT TO authenticated
USING (public.user_has_access(workspace_id, 'tables.view'));

DROP POLICY IF EXISTS tables_insert ON public.tables;
CREATE POLICY tables_insert ON public.tables
FOR INSERT TO authenticated
WITH CHECK (public.user_has_access(workspace_id, 'tables.edit'));

DROP POLICY IF EXISTS tables_update ON public.tables;
CREATE POLICY tables_update ON public.tables
FOR UPDATE TO authenticated
USING (public.user_has_access(workspace_id, 'tables.edit'))
WITH CHECK (public.user_has_access(workspace_id, 'tables.edit'));

DROP POLICY IF EXISTS tables_delete ON public.tables;
CREATE POLICY tables_delete ON public.tables
FOR DELETE TO authenticated
USING (public.user_has_access(workspace_id, 'tables.edit'));

-- 5c. Reports RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select ON public.reports;
CREATE POLICY reports_select ON public.reports
FOR SELECT TO authenticated
USING (public.user_has_access(workspace_id, 'reports.view'));

DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports
FOR INSERT TO authenticated
WITH CHECK (public.user_has_access(workspace_id, 'reports.edit'));

DROP POLICY IF EXISTS reports_update ON public.reports;
CREATE POLICY reports_update ON public.reports
FOR UPDATE TO authenticated
USING (public.user_has_access(workspace_id, 'reports.edit'))
WITH CHECK (public.user_has_access(workspace_id, 'reports.edit'));

DROP POLICY IF EXISTS reports_delete ON public.reports;
CREATE POLICY reports_delete ON public.reports
FOR DELETE TO authenticated
USING (public.user_has_access(workspace_id, 'reports.edit'));

-- 5d. Roles table RLS (workspace-scoped role definitions)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select ON public.roles;
CREATE POLICY roles_select ON public.roles
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS roles_modify ON public.roles;
CREATE POLICY roles_modify ON public.roles
FOR ALL TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'))
WITH CHECK (public.user_has_workspace_role(workspace_id, 'admin'));

-- 5e. Teams table RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS teams_modify ON public.teams;
CREATE POLICY teams_modify ON public.teams
FOR ALL TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'))
WITH CHECK (public.user_has_workspace_role(workspace_id, 'admin'));

-- 5f. Role permissions table RLS (global, admin only can modify)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
CREATE POLICY role_permissions_select ON public.role_permissions
FOR SELECT TO authenticated
USING (TRUE); -- All authenticated users can read permissions

-- No modify policies - role_permissions are managed via migrations only

-- =============================================================================
-- PART 6: UPDATE EXISTING RLS POLICIES TO USE PERMISSION SYSTEM
-- =============================================================================

-- 6a. Pages - use permission-based access
DROP POLICY IF EXISTS pages_select ON public.pages;
CREATE POLICY pages_select ON public.pages
FOR SELECT TO authenticated
USING (public.user_has_access(workspace_id, 'pages.view'));

DROP POLICY IF EXISTS pages_modify ON public.pages;
DROP POLICY IF EXISTS pages_insert ON public.pages;
CREATE POLICY pages_insert ON public.pages
FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_access(workspace_id, 'pages.edit')
  AND (is_system IS NULL OR is_system = FALSE)
);

DROP POLICY IF EXISTS pages_update ON public.pages;
CREATE POLICY pages_update ON public.pages
FOR UPDATE TO authenticated
USING (
  public.user_has_access(workspace_id, 'pages.edit')
  AND (is_system IS NULL OR is_system = FALSE)
)
WITH CHECK (
  public.user_has_access(workspace_id, 'pages.edit')
  AND (is_system IS NULL OR is_system = FALSE)
);

DROP POLICY IF EXISTS pages_delete ON public.pages;
CREATE POLICY pages_delete ON public.pages
FOR DELETE TO authenticated
USING (
  public.user_has_access(workspace_id, 'pages.edit')
  AND (is_system IS NULL OR is_system = FALSE)
);

-- 6b. Chats - users can create their own, view workspace chats
DROP POLICY IF EXISTS chats_select ON public.chats;
CREATE POLICY chats_select ON public.chats
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS chats_modify ON public.chats;
DROP POLICY IF EXISTS chats_insert ON public.chats;
CREATE POLICY chats_insert ON public.chats
FOR INSERT TO authenticated
WITH CHECK (
  public.user_is_workspace_member(workspace_id)
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS chats_update ON public.chats;
CREATE POLICY chats_update ON public.chats
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.user_has_workspace_role(workspace_id, 'admin'))
WITH CHECK (user_id = auth.uid() OR public.user_has_workspace_role(workspace_id, 'admin'));

DROP POLICY IF EXISTS chats_delete ON public.chats;
CREATE POLICY chats_delete ON public.chats
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.user_has_workspace_role(workspace_id, 'admin'));

-- 6c. Messages - users can create their own messages in chats they have access to
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS messages_modify ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
FOR INSERT TO authenticated
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update ON public.messages
FOR UPDATE TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'))
WITH CHECK (public.user_has_workspace_role(workspace_id, 'admin'));

DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages
FOR DELETE TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'));

-- 6d. Documents - workspace members can access
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS documents_modify ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
FOR INSERT TO authenticated
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents
FOR UPDATE TO authenticated
USING (public.user_is_workspace_member(workspace_id))
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
FOR DELETE TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'));

-- 6e. Suggestions, Streams, Votes - keep similar pattern
DROP POLICY IF EXISTS suggestions_select ON public.suggestions;
CREATE POLICY suggestions_select ON public.suggestions
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS suggestions_modify ON public.suggestions;
DROP POLICY IF EXISTS suggestions_insert ON public.suggestions;
CREATE POLICY suggestions_insert ON public.suggestions
FOR INSERT TO authenticated
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS suggestions_update ON public.suggestions;
CREATE POLICY suggestions_update ON public.suggestions
FOR UPDATE TO authenticated
USING (public.user_is_workspace_member(workspace_id))
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS suggestions_delete ON public.suggestions;
CREATE POLICY suggestions_delete ON public.suggestions
FOR DELETE TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'));

-- Streams
DROP POLICY IF EXISTS streams_select ON public.streams;
CREATE POLICY streams_select ON public.streams
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS streams_modify ON public.streams;
DROP POLICY IF EXISTS streams_insert ON public.streams;
CREATE POLICY streams_insert ON public.streams
FOR INSERT TO authenticated
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS streams_update ON public.streams;
CREATE POLICY streams_update ON public.streams
FOR UPDATE TO authenticated
USING (public.user_is_workspace_member(workspace_id))
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS streams_delete ON public.streams;
CREATE POLICY streams_delete ON public.streams
FOR DELETE TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'));

-- Votes
DROP POLICY IF EXISTS votes_select ON public.votes;
CREATE POLICY votes_select ON public.votes
FOR SELECT TO authenticated
USING (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS votes_modify ON public.votes;
DROP POLICY IF EXISTS votes_insert ON public.votes;
CREATE POLICY votes_insert ON public.votes
FOR INSERT TO authenticated
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS votes_update ON public.votes;
CREATE POLICY votes_update ON public.votes
FOR UPDATE TO authenticated
USING (public.user_is_workspace_member(workspace_id))
WITH CHECK (public.user_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS votes_delete ON public.votes;
CREATE POLICY votes_delete ON public.votes
FOR DELETE TO authenticated
USING (public.user_has_workspace_role(workspace_id, 'admin'));

-- =============================================================================
-- PART 7: ADDITIONAL WORKSPACE PERMISSIONS
-- =============================================================================

-- Add workspace management permissions
INSERT INTO public.role_permissions (role_id, permission, description) VALUES
  -- Workspace management (admin only via wildcard, but explicit for documentation)
  ('admin', 'workspace.view', 'View workspace settings'),
  ('admin', 'workspace.edit', 'Edit workspace settings'),
  ('admin', 'workspace.users', 'Manage workspace users'),
  ('admin', 'workspace.invites', 'Manage workspace invites'),
  ('admin', 'workspace.billing', 'Manage billing'),

  -- Builder can view workspace settings
  ('builder', 'workspace.view', 'View workspace settings'),

  -- Chat permissions (all workspace members)
  ('builder', 'chat.create', 'Create chats'),
  ('builder', 'chat.view', 'View chats'),
  ('user', 'chat.create', 'Create chats'),
  ('user', 'chat.view', 'View chats'),
  ('viewer', 'chat.view', 'View chats')
ON CONFLICT (role_id, permission) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES (for testing - commented out)
-- =============================================================================

-- Verify role_permissions populated:
-- SELECT role_id, COUNT(*) as permission_count FROM role_permissions GROUP BY role_id ORDER BY role_id;

-- Test permission function:
-- SELECT user_has_access('your-workspace-id-here', 'pages.edit');

-- Check user's effective permissions:
-- SELECT rp.* FROM role_permissions rp
-- WHERE rp.role_id IN (
--   SELECT jsonb_array_elements_text(get_user_workspace_claims() -> 'workspace-id-here')
-- );

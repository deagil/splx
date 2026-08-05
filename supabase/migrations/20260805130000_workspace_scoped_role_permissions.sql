-- =============================================================================
-- WORKSPACE-SCOPED ROLE PERMISSIONS
-- =============================================================================
-- `roles` is workspace-scoped (composite PK workspace_id + id) but
-- `role_permissions` was global, so a workspace that defined a custom role got
-- no permissions from anywhere and was denied everything.
--
-- This adds a nullable `workspace_id`:
--
--   workspace_id IS NULL      -> global default for that role
--   workspace_id = <uuid>     -> definition for that role in that workspace
--
-- Resolution is **override per role**: if a workspace defines any rows for a
-- role, those rows are that role's complete permission set in that workspace,
-- and the global rows are ignored. If it defines none, the global rows apply.
--
-- Override rather than union so a workspace can *restrict* a built-in role, not
-- only extend it. The trade-off: a workspace that customises `builder` will not
-- pick up new `builder` permissions added globally later. That is the intended
-- meaning of "this workspace defines its own builder", but it does mean adding
-- a permission to the global seed is not automatically visible everywhere.

-- =============================================================================
-- PART 1: SCHEMA
-- =============================================================================

ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS workspace_id uuid
    REFERENCES public.workspaces (id) ON DELETE CASCADE;

COMMENT ON COLUMN public.role_permissions.workspace_id IS
  'NULL = global default for this role. Non-NULL = this workspace''s own definition, which fully replaces the global set for that role.';

-- The primary key cannot include a nullable column, so it is replaced by two
-- partial unique indexes covering the global and workspace-scoped cases.
ALTER TABLE public.role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_global_uniq
  ON public.role_permissions (role_id, permission)
  WHERE workspace_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_workspace_uniq
  ON public.role_permissions (workspace_id, role_id, permission)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS role_permissions_workspace_role_idx
  ON public.role_permissions (workspace_id, role_id);

-- Existing rows were seeded before this column existed and are the global
-- defaults by definition.
UPDATE public.role_permissions SET workspace_id = NULL WHERE workspace_id IS NOT NULL;

-- =============================================================================
-- PART 2: RESOLUTION HELPER
-- =============================================================================
-- Returns the effective permission strings for one role in one workspace.
-- Shared by user_has_access() and read directly by the TypeScript control plane
-- (server/permissions/check.ts), so both sides resolve overrides identically.

CREATE OR REPLACE FUNCTION public.effective_role_permissions(
  p_workspace_id uuid,
  p_role_id text
)
RETURNS TABLE (permission text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT rp.permission
  FROM public.role_permissions rp
  WHERE rp.role_id = p_role_id
    AND rp.workspace_id = p_workspace_id

  UNION ALL

  SELECT rp.permission
  FROM public.role_permissions rp
  WHERE rp.role_id = p_role_id
    AND rp.workspace_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_permissions o
      WHERE o.role_id = p_role_id
        AND o.workspace_id = p_workspace_id
    );
$$;

COMMENT ON FUNCTION public.effective_role_permissions(uuid, text) IS
  'Effective permissions for a role in a workspace: the workspace''s own rows if it has any, otherwise the global defaults.';

-- =============================================================================
-- PART 3: user_has_access RESPECTS OVERRIDES
-- =============================================================================
-- Same wildcard semantics as before ('*' and 'resource.*'), now resolved
-- through effective_role_permissions so workspace overrides are honoured.

CREATE OR REPLACE FUNCTION public.user_has_access(p_workspace_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_roles jsonb;
  v_role_id text;
BEGIN
  IF auth.role() != 'authenticated' THEN
    RETURN FALSE;
  END IF;

  IF public.jwt_is_expired() THEN
    RETURN FALSE;
  END IF;

  -- Allow postgres superuser (for migrations/admin)
  IF SESSION_USER = 'postgres' THEN
    RETURN TRUE;
  END IF;

  user_roles := public.get_user_workspace_claims() -> p_workspace_id::text;

  IF user_roles IS NULL THEN
    RETURN FALSE;
  END IF;

  FOR v_role_id IN SELECT jsonb_array_elements_text(user_roles)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.effective_role_permissions(p_workspace_id, v_role_id) ep
      WHERE ep.permission IN (
        '*',
        split_part(p_permission, '.', 1) || '.*',
        p_permission
      )
    ) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

-- =============================================================================
-- PART 4: RLS
-- =============================================================================
-- The existing role_permissions_select policy exposed every row to any
-- authenticated user, which was harmless while the table was global. Now that
-- rows can be workspace-specific, restrict those to members of that workspace.

DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT
  USING (
    workspace_id IS NULL
    OR public.user_is_workspace_member (workspace_id)
  );

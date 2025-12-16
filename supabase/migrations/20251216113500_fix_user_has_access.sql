-- Fix for user_has_access function
-- Resolves "missing FROM-clause entry for table" error by renaming loop variable

CREATE OR REPLACE FUNCTION public.user_has_access(p_workspace_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_roles jsonb;
  v_role_id text; -- Renamed from role_id to avoid conflict with table column alias
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
  FOR v_role_id IN SELECT jsonb_array_elements_text(user_roles)
  LOOP
    -- Check for wildcard permission (admin)
    IF EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = v_role_id
      AND rp.permission = '*'
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check for resource wildcard (e.g., pages.*)
    IF EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = v_role_id
      AND rp.permission = split_part(p_permission, '.', 1) || '.*'
    ) THEN
      RETURN TRUE;
    END IF;

    -- Check for exact permission
    IF EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = v_role_id
      AND rp.permission = p_permission
    ) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

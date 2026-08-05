-- =============================================================================
-- API CONTROL PLANE: AUDIT LOG + EVENT OUTBOX
-- =============================================================================
-- Backing tables for server/lib/audit.ts and server/lib/events.ts.
--
-- Both are written through the privileged POSTGRES_URL connection by the
-- control plane, never by the browser. RLS is enabled with select-only policies
-- so workspace members can read their own history; there are deliberately no
-- insert/update/delete policies for the authenticated role.
--
-- event_outbox is the seam a future automation runner drains. Nothing consumes
-- it yet.

-- =============================================================================
-- PART 1: AUDIT LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Append-only record of mutations made through the API control plane.';
COMMENT ON COLUMN public.audit_logs.action IS 'Verb in dot notation, e.g. data.created, data.updated, data.deleted.';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Logical resource, e.g. a table config id.';
COMMENT ON COLUMN public.audit_logs.changes IS 'Mutation payload. Keys are validated column names; values are caller-supplied.';
COMMENT ON COLUMN public.audit_logs.request_id IS 'Correlates with the requestId in request logs and error responses.';

CREATE INDEX IF NOT EXISTS audit_logs_workspace_created_idx
  ON public.audit_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_resource_idx
  ON public.audit_logs (workspace_id, resource_type, resource_id);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON public.audit_logs (actor_user_id);

-- =============================================================================
-- PART 2: EVENT OUTBOX
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  actor_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  attempts integer NOT NULL DEFAULT 0,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_outbox IS 'Durable outbox of domain and technical events awaiting a consumer.';
COMMENT ON COLUMN public.event_outbox.event_name IS 'System events use db.<table>.created|updated|deleted. Product events are named per domain.';
COMMENT ON COLUMN public.event_outbox.processed_at IS 'NULL until a consumer acknowledges the event.';

CREATE INDEX IF NOT EXISTS event_outbox_workspace_created_idx
  ON public.event_outbox (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_outbox_name_idx
  ON public.event_outbox (event_name);

-- Partial index: the drain query is "unprocessed, oldest first".
CREATE INDEX IF NOT EXISTS event_outbox_unprocessed_idx
  ON public.event_outbox (created_at)
  WHERE processed_at IS NULL;

-- =============================================================================
-- PART 3: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

DROP POLICY IF EXISTS event_outbox_select ON public.event_outbox;
CREATE POLICY event_outbox_select ON public.event_outbox
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- =============================================================================
-- PART 4: BACKFILL MISSING ROLE PERMISSIONS
-- =============================================================================
-- Two permissions were gated on by route handlers but granted by nothing:
--
--   workspace.manage  -> /api/workspace-apps/[type] (GET and POST)
--   data.read         -> /api/data/[tableName]/schema
--
-- Every non-admin role got a 403 on those routes; admin passed only via the '*'
-- wildcard. data.read is canonicalised to data.view in TypeScript
-- (server/permissions/definitions.ts) rather than seeded, since it was a typo
-- for an existing permission. workspace.manage is a real permission and is
-- seeded here for admin.

INSERT INTO public.role_permissions (role_id, permission, description) VALUES
  ('admin', 'workspace.manage', 'Manage workspace connections and integrations')
ON CONFLICT (role_id, permission) DO NOTHING;

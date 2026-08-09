-- =============================================================================
-- COMMS: email templates, settings, and delivery log
-- =============================================================================
-- See docs/COMMS.md. Workspace-scoped transactional email templates rendered
-- via React Email and sent from the send_email workflow action.

-- =============================================================================
-- PART 1: email_templates
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  subject text NOT NULL DEFAULT '',
  preview_text text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_status_check
    CHECK (status IN ('draft', 'active'))
);

COMMENT ON TABLE public.email_templates IS
  'Workspace email templates: ordered blocks + declared merge variables.';

CREATE UNIQUE INDEX IF NOT EXISTS email_templates_workspace_slug_idx
  ON public.email_templates (workspace_id, slug);

CREATE INDEX IF NOT EXISTS email_templates_workspace_idx
  ON public.email_templates (workspace_id);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_templates_select ON public.email_templates;
CREATE POLICY email_templates_select ON public.email_templates
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- =============================================================================
-- PART 2: email_settings (one row per workspace)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces (id) ON DELETE CASCADE,
  from_name text,
  from_email text,
  reply_to text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_settings IS
  'Per-workspace From / Reply-To for outbound Comms email.';

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_settings_select ON public.email_settings;
CREATE POLICY email_settings_select ON public.email_settings
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- =============================================================================
-- PART 3: email_sends (delivery log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.email_templates (id) ON DELETE SET NULL,
  workflow_run_id uuid REFERENCES public.workflow_runs (id) ON DELETE SET NULL,
  "to" text NOT NULL,
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_sends_status_check
    CHECK (status IN ('queued', 'sent', 'failed'))
);

COMMENT ON TABLE public.email_sends IS
  'Outbound email delivery log for Comms templates.';

CREATE INDEX IF NOT EXISTS email_sends_workspace_idx
  ON public.email_sends (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS email_sends_template_idx
  ON public.email_sends (template_id, created_at DESC);

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_sends_select ON public.email_sends;
CREATE POLICY email_sends_select ON public.email_sends
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- =============================================================================
-- PART 4: permissions
-- =============================================================================

INSERT INTO public.role_permissions (role_id, permission, description, workspace_id)
SELECT v.role_id, v.permission, v.description, NULL
FROM (VALUES
  ('admin', 'comms.view', 'View email templates and settings'),
  ('admin', 'comms.edit', 'Create and edit email templates and settings'),
  ('builder', 'comms.view', 'View email templates and settings'),
  ('builder', 'comms.edit', 'Create and edit email templates and settings'),
  ('user', 'comms.view', 'View email templates and settings'),
  ('viewer', 'comms.view', 'View email templates and settings')
) AS v(role_id, permission, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.role_permissions rp
  WHERE rp.role_id = v.role_id
    AND rp.permission = v.permission
    AND rp.workspace_id IS NULL
);

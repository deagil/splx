-- =============================================================================
-- EVENT TYPES CATALOG
-- =============================================================================
-- Workspace-scoped registry of named event types. System rows (is_system) are
-- seeded and not deletable. Custom types can be added from the Automations UI.
-- Emitting still goes through emitEvent(); this table is documentation + picker
-- fodder for Listeners, not a gate on what may be emitted.

CREATE TABLE IF NOT EXISTS public.event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  payload_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_types_name_not_blank CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE public.event_types IS
  'Catalog of event type names a workspace can listen for. Does not gate emitEvent().';

CREATE UNIQUE INDEX IF NOT EXISTS event_types_workspace_name_uniq
  ON public.event_types (workspace_id, name);

CREATE INDEX IF NOT EXISTS event_types_workspace_idx
  ON public.event_types (workspace_id);

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_types_select ON public.event_types;
CREATE POLICY event_types_select ON public.event_types
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- Seed known system lifecycle types into every existing workspace.
INSERT INTO public.event_types (workspace_id, name, description, is_system, payload_schema)
SELECT
  w.id,
  v.name,
  v.description,
  true,
  '{}'::jsonb
FROM public.workspaces w
CROSS JOIN (
  VALUES
    ('workflow.run.succeeded', 'A workflow run completed successfully'),
    ('workflow.run.failed', 'A workflow run failed after exhausting retries or on a permanent error'),
    ('db.*.created', 'Pattern: a row was created in a data table (actual events use db.<table>.created)'),
    ('db.*.updated', 'Pattern: a row was updated in a data table (actual events use db.<table>.updated)'),
    ('db.*.deleted', 'Pattern: a row was deleted from a data table (actual events use db.<table>.deleted)')
) AS v(name, description)
ON CONFLICT (workspace_id, name) DO NOTHING;

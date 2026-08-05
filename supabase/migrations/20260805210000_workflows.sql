-- =============================================================================
-- WORKFLOWS FOUNDATION
-- =============================================================================
-- Renames event_outbox → event_logs (append-only fact history), strips consumer
-- state from it, and adds workflows / workflow_schedule / workflow_runs.
--
-- Fan-out is transactional inside emitEvent(): a fact and its matching schedule
-- rows are written together. The worker claims due schedule rows.
-- See docs/WORKFLOWS.md.

-- =============================================================================
-- PART 1: event_outbox → event_logs
-- =============================================================================

ALTER TABLE IF EXISTS public.event_outbox RENAME TO event_logs;

DROP INDEX IF EXISTS public.event_outbox_unprocessed_idx;
DROP INDEX IF EXISTS public.event_outbox_workspace_created_idx;
DROP INDEX IF EXISTS public.event_outbox_name_idx;

ALTER TABLE public.event_logs DROP COLUMN IF EXISTS processed_at;
ALTER TABLE public.event_logs DROP COLUMN IF EXISTS attempts;

ALTER TABLE public.event_logs
  ADD COLUMN IF NOT EXISTS caused_by_run_id uuid;

COMMENT ON TABLE public.event_logs IS
  'Append-only fact log of domain and technical events. Fan-out into workflow_schedule happens inside emitEvent(); do not insert here directly.';
COMMENT ON COLUMN public.event_logs.event_name IS
  'System events use db.<table>.created|updated|deleted. Product and workflow lifecycle events are named per domain.';
COMMENT ON COLUMN public.event_logs.caused_by_run_id IS
  'Provenance: the workflow_runs.id that caused this fact, when emitted from a workflow action. Used for the recursion depth guard.';

CREATE INDEX IF NOT EXISTS event_logs_workspace_created_idx
  ON public.event_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_logs_name_idx
  ON public.event_logs (event_name);

-- RLS policy was named event_outbox_select; recreate under the new name.
DROP POLICY IF EXISTS event_outbox_select ON public.event_logs;
DROP POLICY IF EXISTS event_logs_select ON public.event_logs;
CREATE POLICY event_logs_select ON public.event_logs
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- =============================================================================
-- PART 2: workflows (definitions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  trigger_type text NOT NULL,
  event_name text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflows_trigger_type_check
    CHECK (trigger_type IN ('event', 'manual')),
  CONSTRAINT workflows_event_name_for_event_trigger
    CHECK (
      (trigger_type = 'event' AND event_name IS NOT NULL)
      OR (trigger_type = 'manual' AND event_name IS NULL)
    )
);

COMMENT ON TABLE public.workflows IS
  'Durable workflow definitions. Matching against event_logs happens in emitEvent().';

CREATE INDEX IF NOT EXISTS workflows_workspace_idx
  ON public.workflows (workspace_id);

-- Hot path: emitEvent looks up enabled event-triggered workflows by name.
CREATE INDEX IF NOT EXISTS workflows_enabled_event_idx
  ON public.workflows (workspace_id, trigger_type, event_name)
  WHERE enabled;

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflows_select ON public.workflows;
CREATE POLICY workflows_select ON public.workflows
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- =============================================================================
-- PART 3: workflow_schedule (due work / queue)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.event_logs (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  trigger_source text NOT NULL,
  run_after timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  last_error text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  depth integer NOT NULL DEFAULT 0,
  actor_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_schedule_status_check
    CHECK (status IN ('pending', 'running', 'done', 'failed')),
  CONSTRAINT workflow_schedule_trigger_source_check
    CHECK (trigger_source IN ('event', 'manual', 'manual_replay', 'trigger_block'))
);

COMMENT ON TABLE public.workflow_schedule IS
  'Queue of due and pending workflow work. Claimed by the worker with FOR UPDATE SKIP LOCKED.';

CREATE INDEX IF NOT EXISTS workflow_schedule_pending_idx
  ON public.workflow_schedule (run_after)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS workflow_schedule_workflow_idx
  ON public.workflow_schedule (workflow_id, created_at DESC);

-- Idempotent fan-out: a retried emit for the same (workflow, event) does nothing.
CREATE UNIQUE INDEX IF NOT EXISTS workflow_schedule_event_unique_idx
  ON public.workflow_schedule (workflow_id, event_id)
  WHERE trigger_source = 'event' AND event_id IS NOT NULL;

ALTER TABLE public.workflow_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_schedule_select ON public.workflow_schedule;
CREATE POLICY workflow_schedule_select ON public.workflow_schedule
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- =============================================================================
-- PART 4: workflow_runs (execution records)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows (id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.workflow_schedule (id) ON DELETE SET NULL,
  status text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT workflow_runs_status_check
    CHECK (status IN ('running', 'succeeded', 'failed'))
);

COMMENT ON TABLE public.workflow_runs IS
  'Execution records for workflow_schedule items. Append-ish; status updates in place.';

CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx
  ON public.workflow_runs (workflow_id, started_at DESC);

CREATE INDEX IF NOT EXISTS workflow_runs_workspace_idx
  ON public.workflow_runs (workspace_id, started_at DESC);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_runs_select ON public.workflow_runs;
CREATE POLICY workflow_runs_select ON public.workflow_runs
  FOR SELECT
  USING (public.user_is_workspace_member (workspace_id));

-- caused_by_run_id references workflow_runs; add the FK after both tables exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_logs_caused_by_run_id_fkey'
  ) THEN
    ALTER TABLE public.event_logs
      ADD CONSTRAINT event_logs_caused_by_run_id_fkey
      FOREIGN KEY (caused_by_run_id)
      REFERENCES public.workflow_runs (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- PART 5: workflow permissions
-- =============================================================================
-- Vocabulary matches docs/RBAC_SYSTEM.md. role_permissions is workspace-scoped
-- (nullable workspace_id = global default) after 20260805130000.

INSERT INTO public.role_permissions (role_id, permission, description, workspace_id)
SELECT v.role_id, v.permission, v.description, NULL
FROM (VALUES
  ('admin', 'workflows.view', 'View workflows and run history'),
  ('admin', 'workflows.edit', 'Create and edit workflows'),
  ('admin', 'workflows.run', 'Manually run workflows'),
  ('builder', 'workflows.view', 'View workflows and run history'),
  ('builder', 'workflows.edit', 'Create and edit workflows'),
  ('builder', 'workflows.run', 'Manually run workflows'),
  ('user', 'workflows.view', 'View workflows and run history'),
  ('user', 'workflows.run', 'Manually run workflows'),
  ('viewer', 'workflows.view', 'View workflows and run history')
) AS v(role_id, permission, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.role_permissions rp
  WHERE rp.role_id = v.role_id
    AND rp.permission = v.permission
    AND rp.workspace_id IS NULL
);

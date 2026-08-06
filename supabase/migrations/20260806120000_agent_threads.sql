-- =============================================================================
-- AGENT THREADS
-- =============================================================================
-- Persistence for the eve-based sidebar agent. Eve owns no database tables of
-- its own — the event log and the stream cursor are ours to store.
--
-- This is deliberately separate from `chats` / `messages`: the two runtimes run
-- side by side behind NEXT_PUBLIC_AGENT_RUNTIME, and eve's event log does not
-- round-trip cleanly from AI SDK UIMessages. See docs/EVE_AGENT_PORT.md.

CREATE TABLE IF NOT EXISTS public.agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title text,
  state jsonb NOT NULL DEFAULT '{"session":{"streamIndex":0},"events":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agent_threads IS
  'Conversation threads for the eve sidebar agent. Workspace-scoped like every other splx chat table.';
COMMENT ON COLUMN public.agent_threads.state IS
  'Eve event log plus the stream cursor: { session: { sessionId, continuationToken, streamIndex }, events: [] }. Never shrink the event array — see server/repositories/agent-threads.ts.';

-- The sidebar lists a user's own threads, newest first, within one workspace.
CREATE INDEX IF NOT EXISTS agent_threads_workspace_user_updated_idx
  ON public.agent_threads (workspace_id, user_id, updated_at DESC);

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;

-- A thread is private to its author, not shared across the workspace: workspace
-- membership is necessary but not sufficient.
DROP POLICY IF EXISTS agent_threads_select ON public.agent_threads;
CREATE POLICY agent_threads_select ON public.agent_threads
  FOR SELECT
  USING (
    public.user_is_workspace_member (workspace_id)
    AND user_id = auth.uid ()
  );

-- Add is_system field to pages table for system-managed pages
-- System pages cannot be edited or deleted by users
ALTER TABLE public.pages
    ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS pages_is_system_idx ON public.pages(workspace_id, is_system);

-- Add comment
COMMENT ON COLUMN public.pages.is_system IS 'Indicates if this is a system-managed page that cannot be edited or deleted by users';


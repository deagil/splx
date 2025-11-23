-- Add command column to ai_skills table
ALTER TABLE public.ai_skills
ADD COLUMN IF NOT EXISTS command TEXT;

-- Create index for faster lookups by command
CREATE INDEX IF NOT EXISTS idx_ai_skills_command ON public.ai_skills(command);

-- Update existing skills to use name as command (sanitized)
UPDATE public.ai_skills
SET command = LOWER(REGEXP_REPLACE(name, '[^a-z0-9-_]', '-', 'g'))
WHERE command IS NULL;



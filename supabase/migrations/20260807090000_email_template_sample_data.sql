-- Author-supplied sample values for an email template.
--
-- Previews and test sends used to invent placeholders from each variable's type,
-- which rendered "Welcome, Customer first name" as literal body copy. Storing
-- the sample data with the template lets the author write it once and see a
-- realistic email in both the canvas and the true render.
--
-- Shape: { "<variable key>": "<sample value>" }. Keys not declared on the
-- template are ignored at render time, so a renamed variable cannot resurrect a
-- stale value.

alter table public.email_templates
  add column if not exists sample_data jsonb not null default '{}'::jsonb;

comment on column public.email_templates.sample_data is
  'Author-supplied preview values keyed by variable key. Never used for real sends.';

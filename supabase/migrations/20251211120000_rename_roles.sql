-- Rename workspace roles to Admin, Builder, User, Viewer
-- Maps old roles: Admin→Admin, Developer→Builder, Staff→User, User→Viewer

-- 1) Ensure new roles exist for every workspace
insert into public.roles (workspace_id, id, label, description, level)
select distinct workspace_id,
  'builder' as id,
  'Builder' as label,
  'Builder access for creating apps and automations' as description,
  80 as level
from public.roles
on conflict (workspace_id, id) do nothing;

insert into public.roles (workspace_id, id, label, description, level)
select distinct workspace_id,
  'viewer' as id,
  'Viewer' as label,
  'Read-only access to workspace resources' as description,
  10 as level
from public.roles
on conflict (workspace_id, id) do nothing;

-- If any workspace is missing a user role (new standard member), add it
insert into public.roles (workspace_id, id, label, description, level)
select distinct workspace_id,
  'user' as id,
  'User' as label,
  'Standard member with configured create/update access' as description,
  50 as level
from public.roles
on conflict (workspace_id, id) do nothing;

-- 2) Remap workspace user memberships
update public.workspace_users
set role_id = case
  when role_id = 'dev' then 'builder'
  when role_id = 'staff' then 'user'
  when role_id = 'user' then 'viewer'
  else role_id
end
where role_id in ('dev', 'staff', 'user');

-- 3) Remap outstanding invites
update public.workspace_invites
set roles = (
  select array_agg(
    case
      when role = 'dev' then 'builder'
      when role = 'staff' then 'user'
      when role = 'user' then 'viewer'
      else role
    end
  )
  from unnest(roles) as t(role)
)
where roles && array['dev', 'staff', 'user'];

-- 4) Update role labels/levels for the new scheme
update public.roles
set label = 'Admin',
    description = 'Full access to all workspace features',
    level = 100
where id = 'admin';

update public.roles
set label = 'Builder',
    description = 'Builder access for creating apps and automations (limited billing/workspace settings)',
    level = 80
where id = 'builder';

update public.roles
set label = 'User',
    description = 'Standard member with configured create/update access',
    level = 50
where id = 'user';

update public.roles
set label = 'Viewer',
    description = 'Read-only access to workspace resources',
    level = 10
where id = 'viewer';

-- 5) Drop retired role ids now that references are remapped
delete from public.roles
where id in ('dev', 'staff');


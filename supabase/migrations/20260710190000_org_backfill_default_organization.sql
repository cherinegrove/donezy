-- Phase A: establish "organizations" + "user_organizations" as the real tenant
-- boundary. Creates one Default Organization representing today's single-tenant
-- reality, adds every current user as a member, and backfills organization_id on
-- the core data tables so the following RLS migrations can enforce tenant
-- isolation without disrupting anyone. Purely additive — no RLS policy currently
-- requires organization_id, so this migration has zero observable effect on its
-- own. Idempotent: safe to re-run.

do $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (name, slug, subscription_plan, max_users, max_guests)
  values ('Cybersolve', 'cybersolve', 'enterprise', 50, 20)
  on conflict (slug) do nothing;

  select id into v_org_id from public.organizations where slug = 'cybersolve';

  insert into public.user_organizations (user_id, organization_id, role)
  select
    u.id,
    v_org_id,
    case
      when has_system_role(u.id, 'platform_admin'::system_role_type) then 'owner'
      when has_system_role(u.id, 'support_admin'::system_role_type) then 'admin'
      else 'member'
    end
  from auth.users u
  on conflict (user_id, organization_id) do nothing;

  update public.tasks set organization_id = v_org_id where organization_id is null;
  update public.projects set organization_id = v_org_id where organization_id is null;
  update public.clients set organization_id = v_org_id where organization_id is null;
  update public.time_entries set organization_id = v_org_id where organization_id is null;
  update public.notes set organization_id = v_org_id where organization_id is null;
end $$;

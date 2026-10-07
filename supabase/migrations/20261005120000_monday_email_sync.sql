-- Monday.com -> Donezy task sync.
-- Monday notification emails (notifications@monday.com) land in a HubSpot
-- inbox; the monday-email-sync edge function reads them and creates one
-- Donezy task per Monday item, adding later updates as comments.
-- All tables are service-role only (RLS on, no policies).

create table if not exists public.monday_sync_routes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  -- lowercase substrings; an email routes here if any term appears in it
  match_terms text[] not null,
  owner_auth_user_id uuid not null,
  default_assignee_id text,
  default_status text not null default 'todo',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.monday_sync_items (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.monday_sync_routes(id) on delete cascade,
  item_key text not null,
  item_name text not null,
  monday_pulse_id text,
  monday_url text,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (route_id, item_key)
);

create table if not exists public.monday_sync_messages (
  hubspot_message_id text primary key,
  hubspot_thread_id text,
  status text not null, -- task_created | comment_added | unrouted | skipped | error
  item_id uuid references public.monday_sync_items(id) on delete set null,
  detail text,
  processed_at timestamptz not null default now()
);

create table if not exists public.monday_sync_state (
  id int primary key default 1 check (id = 1),
  cursor_ts timestamptz not null,
  last_run_at timestamptz,
  last_result jsonb
);

alter table public.monday_sync_routes enable row level security;
alter table public.monday_sync_items enable row level security;
alter table public.monday_sync_messages enable row level security;
alter table public.monday_sync_state enable row level security;

-- Seed: both clients route to their projects, owned by + assigned to Jordan
-- (the notifications arrive in Jordan's SR Pro inbox).
insert into public.monday_sync_routes (project_id, label, match_terms, owner_auth_user_id, default_assignee_id)
select p.id, v.label, v.terms, '7ee5c665-b17f-4aec-ab60-5c5c187993d6'::uuid, '7ee5c665-b17f-4aec-ab60-5c5c187993d6'
from (values
  ('d39010b5-7428-4c0a-8069-c73a8cbcece6'::uuid, 'Ship4WD', array['ship4wd']),
  ('cb557930-309e-4fb5-998c-ceda9aff566d'::uuid, 'Priority Software',
     array['priority-software', 'priority software', 'hubspot / srpro', 'miki weiser', 'matan lahav', 'nurit yazbin'])
) as v(project_id, label, terms)
join public.projects p on p.id = v.project_id
where not exists (select 1 from public.monday_sync_routes r where r.project_id = v.project_id);

-- Start from 1 Oct 2026 so the notifications already in the inbox are picked up.
insert into public.monday_sync_state (id, cursor_ts) values (1, '2026-10-01T00:00:00Z')
on conflict (id) do nothing;

-- Independent VPCs (Level 2) with many-to-many opportunity links.
-- Keeps the legacy twin_sessions.vpc_value_map flow readable while introducing
-- a project-level VPC entity.

alter table twin_sessions
  add column if not exists vpc_value_map jsonb default '{}';

create table if not exists vpcs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  customer_profile_name text not null,
  source_type text not null default 'manual',
  customer_profile jsonb not null default '{"jobs":[],"pains":[],"gains":[]}'::jsonb,
  value_map jsonb not null default '{"productsAndServices":[],"painRelievers":[],"gainCreators":[]}'::jsonb,
  final_canvas jsonb not null default '{"productsAndServices":[],"painRelievers":[],"gainCreators":[],"jobs":[],"pains":[],"gains":[]}'::jsonb,
  interview_attachment jsonb,
  twin_transcript jsonb,
  legacy_twin_session_id uuid references twin_sessions on delete set null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists vpc_opportunities (
  vpc_id uuid references vpcs on delete cascade not null,
  opportunity_id uuid references opportunities on delete cascade not null,
  created_at timestamptz default now(),
  primary key (vpc_id, opportunity_id)
);

create index if not exists vpcs_project_id_idx on vpcs(project_id);
create index if not exists vpc_opportunities_opportunity_id_idx on vpc_opportunities(opportunity_id);

alter table vpcs enable row level security;
alter table vpc_opportunities enable row level security;

drop policy if exists "vpcs_own" on vpcs;
create policy "vpcs_own" on vpcs
  for all using (
    exists (
      select 1 from projects
      where projects.id = vpcs.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "vpc_opportunities_own" on vpc_opportunities;
create policy "vpc_opportunities_own" on vpc_opportunities
  for all using (
    exists (
      select 1 from vpcs
      join projects on projects.id = vpcs.project_id
      where vpcs.id = vpc_opportunities.vpc_id
        and projects.user_id = auth.uid()
    )
  );

insert into vpcs (
  project_id,
  customer_profile_name,
  source_type,
  customer_profile,
  value_map,
  final_canvas,
  legacy_twin_session_id,
  created_at,
  updated_at
)
select
  opportunities.project_id,
  coalesce(nullif(opportunities.customer_segment, ''), opportunities.name, 'Imported VPC'),
  'legacy_twin_session',
  jsonb_build_object(
    'jobs', coalesce(twin_sessions.vpc_value_map->'jobs', '[]'::jsonb),
    'pains', coalesce(twin_sessions.vpc_value_map->'pains', '[]'::jsonb),
    'gains', coalesce(twin_sessions.vpc_value_map->'gains', '[]'::jsonb)
  ),
  jsonb_build_object(
    'productsAndServices', coalesce(twin_sessions.vpc_value_map->'productsAndServices', '[]'::jsonb),
    'painRelievers', coalesce(twin_sessions.vpc_value_map->'painRelievers', '[]'::jsonb),
    'gainCreators', coalesce(twin_sessions.vpc_value_map->'gainCreators', '[]'::jsonb)
  ),
  twin_sessions.vpc_value_map,
  twin_sessions.id,
  coalesce(twin_sessions.created_at, now()),
  coalesce(twin_sessions.created_at, now())
from twin_sessions
join opportunities on opportunities.id = twin_sessions.opportunity_id
where twin_sessions.vpc_value_map is not null
  and twin_sessions.vpc_value_map <> '{}'::jsonb
on conflict (legacy_twin_session_id) do nothing;

insert into vpc_opportunities (vpc_id, opportunity_id, created_at)
select vpcs.id, twin_sessions.opportunity_id, coalesce(twin_sessions.created_at, now())
from vpcs
join twin_sessions on twin_sessions.id = vpcs.legacy_twin_session_id
where vpcs.legacy_twin_session_id is not null
on conflict (vpc_id, opportunity_id) do nothing;
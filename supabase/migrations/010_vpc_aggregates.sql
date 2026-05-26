-- VPC aggregates: is_aggregate flag + source tracking
alter table vpcs
  add column if not exists is_aggregate boolean not null default false;

create table if not exists vpc_aggregates (
  id uuid primary key default gen_random_uuid(),
  aggregate_vpc_id uuid references vpcs on delete cascade not null,
  source_vpc_id uuid references vpcs on delete cascade not null,
  created_at timestamptz default now(),
  unique (aggregate_vpc_id, source_vpc_id)
);

create index if not exists vpc_aggregates_aggregate_idx on vpc_aggregates(aggregate_vpc_id);
create index if not exists vpc_aggregates_source_idx on vpc_aggregates(source_vpc_id);

alter table vpc_aggregates enable row level security;

drop policy if exists "vpc_aggregates_own" on vpc_aggregates;
create policy "vpc_aggregates_own" on vpc_aggregates
  for all using (
    exists (
      select 1 from vpcs
      join projects on projects.id = vpcs.project_id
      where vpcs.id = vpc_aggregates.aggregate_vpc_id
        and projects.user_id = auth.uid()
    )
  );
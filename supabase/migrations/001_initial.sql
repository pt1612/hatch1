-- profiles
create table profiles (
  id uuid primary key references auth.users,
  full_name text,
  is_admin boolean default false
);

-- projects (replaces "sessions" in Vela)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null default 'New Project',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- abilities
create table abilities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- opportunities
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  name text not null,
  application text,
  customer_segment text,
  description text,
  phase text default 'abilities', -- 'abilities' | 'evaluated'
  potential_score text, -- 'low' | 'mid' | 'high' | 'super_high'
  challenge_score text,
  created_at timestamptz default now()
);

-- evaluations (replaces "interviews" in Vela for the 6-dimension report)
create table evaluations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities on delete cascade not null,
  messages jsonb default '[]',
  dimension_scores jsonb default '{}',
  report jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- strategies
create table strategies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null unique,
  primary_opportunity_id uuid references opportunities,
  classifications jsonb default '{}',
  created_at timestamptz default now()
);

-- twins
create table twins (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  opportunity_id uuid references opportunities on delete cascade not null,
  name text not null,
  role text,
  segment text,
  personality text,
  pain_points text[],
  tech_level text, -- 'low' | 'medium' | 'high'
  budget_tier text, -- 'low' | 'mid' | 'premium'
  affinity_label text, -- 'high_affinity' | 'moderate' | 'early_adopter'
  created_at timestamptz default now()
);

-- twin_interviews
create table twin_interviews (
  id uuid primary key default gen_random_uuid(),
  twin_id uuid references twins on delete cascade not null,
  opportunity_id uuid references opportunities on delete cascade not null,
  messages jsonb default '[]',
  gains text[],
  pains text[],
  jobs_to_be_done text[],
  segment_attractiveness integer, -- 0-100
  ability_to_serve integer, -- 0-100
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- twin_sessions (groups a set of twins for a given opportunity)
create table twin_sessions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities on delete cascade not null unique,
  suggested_segments text[], -- AI-suggested segments, editable by user
  report jsonb, -- overall report after all interviews
  created_at timestamptz default now()
);

-- ─── RLS ───────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table projects enable row level security;
alter table abilities enable row level security;
alter table opportunities enable row level security;
alter table evaluations enable row level security;
alter table strategies enable row level security;
alter table twins enable row level security;
alter table twin_interviews enable row level security;
alter table twin_sessions enable row level security;

-- profiles: own row only
create policy "profiles_own" on profiles
  for all using (auth.uid() = id);

-- projects: own rows only
create policy "projects_own" on projects
  for all using (auth.uid() = user_id);

-- abilities: via project ownership
create policy "abilities_own" on abilities
  for all using (
    exists (select 1 from projects where projects.id = abilities.project_id and projects.user_id = auth.uid())
  );

-- opportunities: via project ownership
create policy "opportunities_own" on opportunities
  for all using (
    exists (select 1 from projects where projects.id = opportunities.project_id and projects.user_id = auth.uid())
  );

-- evaluations: via opportunity → project ownership
create policy "evaluations_own" on evaluations
  for all using (
    exists (
      select 1 from opportunities
      join projects on projects.id = opportunities.project_id
      where opportunities.id = evaluations.opportunity_id
        and projects.user_id = auth.uid()
    )
  );

-- strategies: via project ownership
create policy "strategies_own" on strategies
  for all using (
    exists (select 1 from projects where projects.id = strategies.project_id and projects.user_id = auth.uid())
  );

-- twins: via project ownership
create policy "twins_own" on twins
  for all using (
    exists (select 1 from projects where projects.id = twins.project_id and projects.user_id = auth.uid())
  );

-- twin_interviews: via opportunity → project ownership
create policy "twin_interviews_own" on twin_interviews
  for all using (
    exists (
      select 1 from opportunities
      join projects on projects.id = opportunities.project_id
      where opportunities.id = twin_interviews.opportunity_id
        and projects.user_id = auth.uid()
    )
  );

-- twin_sessions: via opportunity → project ownership
create policy "twin_sessions_own" on twin_sessions
  for all using (
    exists (
      select 1 from opportunities
      join projects on projects.id = opportunities.project_id
      where opportunities.id = twin_sessions.opportunity_id
        and projects.user_id = auth.uid()
    )
  );

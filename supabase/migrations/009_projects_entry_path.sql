-- Optional onboarding entry path (four cards: full, idea, vpc, bmc).
-- Used by app/project/[id]/onboarding/page.tsx and TopNav (projects.entry_path).

alter table projects
  add column if not exists entry_path text;

alter table projects
  drop constraint if exists projects_entry_path_check;

alter table projects
  add constraint projects_entry_path_check
  check (entry_path is null or entry_path in ('full', 'idea', 'vpc', 'bmc'));

comment on column projects.entry_path is 'Onboarding choice: full | idea | vpc | bmc; null if not chosen yet.';
